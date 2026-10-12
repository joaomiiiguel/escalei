import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.FOOTBALL_DATA_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error("FOOTBALL_DATA_API_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

function positionFromFootballData(value) {
  const position = String(value ?? "").toLowerCase();
  if (position.includes("goalkeeper")) return "GOL";
  if (/(defence|defense|back|sweeper)/.test(position)) return "DEF";
  if (position.includes("midfield")) return "MEI";
  if (/(offence|offense|forward|winger|striker)/.test(position)) return "ATA";
  return null;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const normalizeName = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const footballDataInternalId = (externalId) => {
  const internalId = 1_000_000_000 + externalId;
  if (!Number.isSafeInteger(internalId) || internalId > 2_147_483_647) {
    throw new Error(`O ID externo ${externalId} não cabe na faixa interna reservada para a football-data.`);
  }
  return internalId;
};

async function fetchSquad(club) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.football-data.org/v4/teams/${club.football_data_id}`, {
      headers: { "X-Auth-Token": apiKey, Accept: "application/json" },
    });
    const payload = await response.json();
    const apiError = payload.message ?? payload.error ?? "";
    const isRateLimited = response.status === 429 || /rate|limit|too many|requests/i.test(String(apiError));

    if (isRateLimited && attempt < 3) {
      const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "60");
      await wait(Math.max(60, retryAfterSeconds) * 1_000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`football-data.org falhou para ${club.nome}: HTTP ${response.status} (${apiError || "resposta inválida"}).`);
    }

    return payload.squad;
  }

  throw new Error(`football-data.org excedeu o limite de tentativas para ${club.nome}.`);
}

const { data: clubs, error: clubsError } = await supabase
  .from("clubes")
  .select("id, nome, football_data_id")
  .eq("ativo", true)
  .not("football_data_id", "is", null)
  .not("logo_url", "is", null)
  .order("id");

if (clubsError) throw new Error(`Não foi possível consultar os clubes ativos: ${clubsError.message}`);
if (!clubs?.length) throw new Error("Não há clubes ativos para sincronizar.");

const { data: existingPlayers, error: existingPlayersError } = await supabase
  .from("jogadores")
  .select("id, clube_id, nome, football_data_id");
if (existingPlayersError) throw new Error(`Não foi possível consultar os jogadores atuais: ${existingPlayersError.message}`);

const existingByFootballDataId = new Map((existingPlayers ?? []).flatMap((player) => player.football_data_id ? [[player.football_data_id, player]] : []));
const existingByClubAndName = new Map((existingPlayers ?? []).map((player) => [`${player.clube_id}:${normalizeName(player.nome)}`, player]));

const playersByClub = new Map();

for (const [index, club] of clubs.entries()) {
  const squad = await fetchSquad(club);
  if (!Array.isArray(squad) || squad.length === 0) {
    throw new Error(`football-data.org não retornou elenco para ${club.nome}; sincronização cancelada sem desativar atletas.`);
  }

  const playersWithoutFantasyPosition = [];
  const players = squad.flatMap((player) => {
    const position = positionFromFootballData(player.position);
    if (!Number.isInteger(player.id) || !player.name?.trim()) {
      throw new Error(`football-data.org retornou um jogador inválido para ${club.nome}; sincronização cancelada.`);
    }
    if (!position) {
      playersWithoutFantasyPosition.push(player.name.trim());
      return [];
    }

    const existingPlayer = existingByFootballDataId.get(player.id) ?? existingByClubAndName.get(`${club.id}:${normalizeName(player.name)}`);

    return [{
      id: existingPlayer?.id ?? footballDataInternalId(player.id),
      football_data_id: player.id,
      clube_id: club.id,
      nome: player.name.trim(),
      nome_exibicao: player.name.trim().slice(0, 16),
      numero: Number.isInteger(player.shirtNumber) ? player.shirtNumber : null,
      posicao: position,
      preco: 5,
      preco_inicial: 5,
      media_temporada: 0,
      media_ult5: 0,
      jogos_temporada: 0,
      status: "PROVAVEL",
      status_motivo: null,
      ativo: true,
      api_atualizado_em: new Date().toISOString(),
    }];
  });

  if (!players.length) throw new Error(`football-data.org não retornou jogadores com posição utilizável para ${club.nome}.`);
  if (playersWithoutFantasyPosition.length) {
    console.warn(`${club.nome}: ${playersWithoutFantasyPosition.length} jogadores sem posição foram ignorados.`);
  }

  playersByClub.set(club.id, players);

  if (index < clubs.length - 1) await wait(6_100);
}

const playersById = new Map();
let duplicatePlayers = 0;
for (const player of [...playersByClub.values()].flat()) {
  if (playersById.has(player.id)) duplicatePlayers += 1;
  playersById.set(player.id, player);
}
const players = [...playersById.values()];
if (duplicatePlayers) {
  console.warn(`${duplicatePlayers} atletas repetidos em elencos da fonte foram deduplicados antes da gravação.`);
}
const { error: upsertError } = await supabase.from("jogadores").upsert(players, { onConflict: "id" });
if (upsertError) throw new Error(`Não foi possível gravar os jogadores: ${upsertError.message}`);

for (const [clubId, squad] of playersByClub) {
  const squadIds = squad.map(({ id }) => id);
  const { error: deactivateError } = await supabase
    .from("jogadores")
    .update({ ativo: false })
    .eq("clube_id", clubId)
    .eq("ativo", true)
    .not("id", "in", `(${squadIds.join(",")})`);

  if (deactivateError) throw new Error(`Não foi possível desativar jogadores fora do elenco do clube ${clubId}: ${deactivateError.message}`);
}

const { data: activePlayers, error: verificationError } = await supabase
  .from("jogadores")
  .select("id, clube_id")
  .eq("ativo", true)
  .in("clube_id", clubs.map(({ id }) => id));

if (verificationError || activePlayers?.length !== players.length) {
  throw new Error("A verificação dos elencos sincronizados falhou.");
}

console.log(`Elencos sincronizados: ${players.length} jogadores ativos em ${clubs.length} clubes.`);
