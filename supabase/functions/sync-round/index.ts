import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  homeTeam: { id: number };
  awayTeam: { id: number };
  score?: { fullTime?: { home?: number | null; away?: number | null } };
};

const statusByFootballData: Record<string, "A_JOGAR" | "EM_ANDAMENTO" | "ENCERRADO" | "ADIADO" | "CANCELADO"> = {
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

const activeStatuses = ["IN_PLAY", "PAUSED", "SUSPENDED"];
const completedStatuses = ["FINISHED", "CANCELLED", "AWARDED"];

function localDateInFortaleza(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function selectCurrentMatchday(matches: FootballDataMatch[], now: Date) {
  const active = matches.filter((match) => activeStatuses.includes(match.status));
  if (active.length) return Math.min(...active.map((match) => match.matchday));

  const upcoming = matches.filter((match) => new Date(match.utcDate) >= now && !completedStatuses.includes(match.status));
  if (upcoming.length) return Math.min(...upcoming.map((match) => match.matchday));

  const completed = matches.filter((match) => completedStatuses.includes(match.status));
  if (completed.length) return Math.max(...completed.map((match) => match.matchday));

  throw new Error("A football-data.org não retornou uma rodada utilizável.");
}

function internalGameId(footballDataId: number) {
  const id = 1_500_000_000 + footballDataId;
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
    throw new Error("O identificador da partida não cabe na faixa interna reservada.");
  }
  return id;
}

Deno.serve(async () => {
  const apiKey = Deno.env.get("FOOTBALL_DATA_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const competitionCode = Deno.env.get("FOOTBALL_DATA_COMPETITION_CODE") ?? "BSA";
  const season = Number(Deno.env.get("FOOTBALL_DATA_SEASON") ?? "2026");

  if (!apiKey || !supabaseUrl || !serviceRoleKey || !Number.isInteger(season)) {
    return Response.json({ error: "Configuração do job incompleta." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const now = new Date();
  const date = localDateInFortaleza(now);
  const dayStart = new Date(`${date}T00:00:00-03:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const reference = `data=${date}`;

  const { data: execution, error: executionError } = await supabase
    .from("sync_execucoes")
    .insert({ tipo: "RODADA", referencia: reference, iniciado_em: now.toISOString(), requisicoes: 0, sucesso: false })
    .select("id")
    .single();
  if (executionError || !execution) {
    return Response.json({ error: "Não foi possível iniciar o registro da sincronização." }, { status: 500 });
  }

  try {
    const { count: gamesToday, error: gamesTodayError } = await supabase
      .from("jogos")
      .select("id", { count: "exact", head: true })
      .gte("inicio_em", dayStart.toISOString())
      .lt("inicio_em", dayEnd.toISOString());
    if (gamesTodayError) throw new Error("Não foi possível verificar a agenda local.");

    if (!gamesToday) {
      await supabase
        .from("sync_execucoes")
        .update({ terminado_em: new Date().toISOString(), sucesso: true })
        .eq("id", execution.id);
      return Response.json({ skipped: true, reason: "Nenhum jogo agendado para hoje." });
    }

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${encodeURIComponent(competitionCode)}/matches?season=${season}`,
      { headers: { "X-Auth-Token": apiKey, Accept: "application/json" } },
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(payload.matches)) {
      throw new Error(`football-data.org respondeu HTTP ${response.status}.`);
    }

    const allMatches = payload.matches as FootballDataMatch[];
    const matchday = selectCurrentMatchday(allMatches, now);
    const matches = allMatches.filter((match) => match.matchday === matchday);
    if (matches.length !== 10) throw new Error(`A rodada ${matchday} retornou ${matches.length} partidas.`);

    const clubExternalIds = [...new Set(matches.flatMap((match) => [match.homeTeam.id, match.awayTeam.id]))];
    const { data: clubs, error: clubsError } = await supabase
      .from("clubes")
      .select("id, football_data_id")
      .in("football_data_id", clubExternalIds)
      .eq("ativo", true);
    if (clubsError) throw new Error("Não foi possível consultar os clubes da rodada.");
    const clubIdByExternalId = new Map((clubs ?? []).map((club) => [club.football_data_id, club.id]));
    if (clubExternalIds.some((id) => !clubIdByExternalId.has(id))) {
      throw new Error("Há clubes da rodada sem mapeamento local.");
    }

    const starts = matches.map((match) => new Date(match.utcDate)).sort((a, b) => a.getTime() - b.getTime());
    const gameStatuses = matches.map((match) => statusByFootballData[match.status]);
    if (gameStatuses.some((status) => !status)) throw new Error("A API retornou um status de partida sem mapeamento.");
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
    if (existingRoundError) throw new Error("Não foi possível consultar a rodada.");

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
      .select("id")
      .single();
    if (roundError || !round) throw new Error("Não foi possível gravar a rodada.");

    const { data: existingGames, error: existingGamesError } = await supabase
      .from("jogos")
      .select("id, football_data_id")
      .in("football_data_id", matches.map((match) => match.id));
    if (existingGamesError) throw new Error("Não foi possível consultar partidas existentes.");
    const gameIdByExternalId = new Map((existingGames ?? []).map((game) => [game.football_data_id, game.id]));

    const { error: gamesError } = await supabase.from("jogos").upsert(matches.map((match) => ({
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
    })), { onConflict: "id" });
    if (gamesError) throw new Error("Não foi possível gravar as partidas.");

    const quota = Number(response.headers.get("X-Requests-Available-Minute"));
    await supabase
      .from("sync_execucoes")
      .update({
        terminado_em: new Date().toISOString(),
        requisicoes: 1,
        cota_restante: Number.isFinite(quota) ? quota : null,
        sucesso: true,
      })
      .eq("id", execution.id);

    return Response.json({ skipped: false, matchday, games: matches.length, roundStatus });
  } catch (error) {
    await supabase
      .from("sync_execucoes")
      .update({ terminado_em: new Date().toISOString(), requisicoes: 1, sucesso: false, erro: "Falha na sincronização da rodada." })
      .eq("id", execution.id);
    console.error(error);
    return Response.json({ error: "A sincronização da rodada falhou." }, { status: 500 });
  }
});
