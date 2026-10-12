import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.FOOTBALL_DATA_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const competitionCode = process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "BSA";
const season = Number(process.env.FOOTBALL_DATA_SEASON ?? "2026");

if (!apiKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error("FOOTBALL_DATA_API_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const statusByFootballData = {
  SCHEDULED: "A_JOGAR",
  TIMED: "A_JOGAR",
  IN_PLAY: "EM_ANDAMENTO",
  PAUSED: "EM_ANDAMENTO",
  SUSPENDED: "EM_ANDAMENTO",
  FINISHED: "ENCERRADO",
  POSTPONED: "ADIADO",
  CANCELLED: "CANCELADO",
  AWARDED: "ENCERRADO",
};

const internalGameId = (footballDataId) => {
  const id = 1_500_000_000 + footballDataId;
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
    throw new Error(`O ID externo ${footballDataId} não cabe na faixa interna reservada para partidas da football-data.`);
  }
  return id;
};

function selectCurrentMatchday(matches, now) {
  const active = matches.filter((match) => ["IN_PLAY", "PAUSED", "SUSPENDED"].includes(match.status));
  if (active.length) return Math.min(...active.map((match) => match.matchday));

  const upcoming = matches.filter((match) => new Date(match.utcDate) >= now && !["FINISHED", "CANCELLED", "AWARDED"].includes(match.status));
  if (upcoming.length) return Math.min(...upcoming.map((match) => match.matchday));

  const completed = matches.filter((match) => ["FINISHED", "CANCELLED", "AWARDED"].includes(match.status));
  if (completed.length) return Math.max(...completed.map((match) => match.matchday));

  throw new Error("football-data.org não retornou uma rodada com status utilizável.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const response = await fetch(`https://api.football-data.org/v4/competitions/${encodeURIComponent(competitionCode)}/matches?season=${season}`, {
  headers: { "X-Auth-Token": apiKey, Accept: "application/json" },
});
const payload = await response.json().catch(() => ({}));
if (!response.ok || !Array.isArray(payload.matches)) {
  throw new Error(`football-data.org não retornou partidas: HTTP ${response.status}${payload.message ? ` (${payload.message})` : ""}.`);
}

const now = new Date();
const matchday = selectCurrentMatchday(payload.matches, now);
const matches = payload.matches.filter((match) => match.matchday === matchday);
if (matches.length !== 10) throw new Error(`A rodada ${matchday} retornou ${matches.length} partidas; sincronização cancelada.`);

const clubExternalIds = [...new Set(matches.flatMap((match) => [match.homeTeam?.id, match.awayTeam?.id]))];
if (clubExternalIds.some((id) => !Number.isInteger(id))) throw new Error("Uma partida retornou clube sem identificador externo.");
const { data: clubs, error: clubsError } = await supabase
  .from("clubes")
  .select("id, football_data_id")
  .in("football_data_id", clubExternalIds)
  .eq("ativo", true);
if (clubsError) throw new Error(`Não foi possível consultar os clubes da rodada: ${clubsError.message}`);
const clubIdByExternalId = new Map((clubs ?? []).map((club) => [club.football_data_id, club.id]));
const missingClubs = clubExternalIds.filter((id) => !clubIdByExternalId.has(id));
if (missingClubs.length) throw new Error(`Há ${missingClubs.length} clubes da rodada sem mapeamento local. Execute sync:clubs antes.`);

const starts = matches.map((match) => new Date(match.utcDate)).sort((a, b) => a - b);
const gameStatuses = matches.map((match) => statusByFootballData[match.status]);
if (gameStatuses.some((status) => !status)) throw new Error("A football-data retornou um status de partida sem mapeamento.");
const roundStatus = gameStatuses.includes("EM_ANDAMENTO")
  ? "EM_ANDAMENTO"
  : gameStatuses.every((status) => status === "ENCERRADO" || status === "CANCELADO")
    ? "FECHADA"
    : starts[0] <= now ? "EM_ANDAMENTO" : "ABERTA";

const { data: existingRound, error: existingRoundError } = await supabase
  .from("rodadas")
  .select("id, abre_em")
  .eq("temporada", season)
  .eq("numero", matchday)
  .maybeSingle();
if (existingRoundError) throw new Error(`Não foi possível consultar a rodada atual: ${existingRoundError.message}`);

const { data: round, error: roundError } = await supabase
  .from("rodadas")
  .upsert({
    temporada: season,
    numero: matchday,
    rotulo_api: `${competitionCode} — Rodada ${matchday}`,
    status: roundStatus,
    abre_em: existingRound?.abre_em ?? starts[0].toISOString(),
    trava_em: starts[0].toISOString(),
    fechada_em: roundStatus === "FECHADA" ? now.toISOString() : null,
    versao_regras: 1,
  }, { onConflict: "temporada,numero" })
  .select("id, numero, status, trava_em")
  .single();
if (roundError || !round) throw new Error(`Não foi possível gravar a rodada atual: ${roundError?.message ?? "resposta vazia"}`);

const { data: existingGames, error: existingGamesError } = await supabase
  .from("jogos")
  .select("id, football_data_id")
  .in("football_data_id", matches.map((match) => match.id));
if (existingGamesError) throw new Error(`Não foi possível consultar partidas existentes: ${existingGamesError.message}`);
const gameIdByExternalId = new Map((existingGames ?? []).map((game) => [game.football_data_id, game.id]));

const games = matches.map((match) => ({
  id: gameIdByExternalId.get(match.id) ?? internalGameId(match.id),
  football_data_id: match.id,
  rodada_id: round.id,
  clube_casa_id: clubIdByExternalId.get(match.homeTeam.id),
  clube_fora_id: clubIdByExternalId.get(match.awayTeam.id),
  inicio_em: match.utcDate,
  status: statusByFootballData[match.status],
  status_api: match.status,
  gols_casa: match.score?.fullTime?.home ?? null,
  gols_fora: match.score?.fullTime?.away ?? null,
  api_atualizado_em: now.toISOString(),
}));

const { error: gamesError } = await supabase.from("jogos").upsert(games, { onConflict: "id" });
if (gamesError) throw new Error(`Não foi possível gravar os jogos da rodada: ${gamesError.message}`);

const { count: gamesCount, error: verificationError } = await supabase
  .from("jogos")
  .select("id", { count: "exact", head: true })
  .eq("rodada_id", round.id)
  .in("football_data_id", matches.map((match) => match.id));
if (verificationError || gamesCount !== games.length) throw new Error("A verificação dos jogos sincronizados falhou.");

console.log(`Rodada ${round.numero} sincronizada: ${gamesCount} jogos, status ${round.status}, trava em ${round.trava_em}.`);
