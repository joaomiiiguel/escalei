import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.API_FOOTBALL_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !supabaseUrl || !serviceRoleKey) {
  throw new Error("API_FOOTBALL_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const positionByApiName = {
  Goalkeeper: "GOL",
  Defender: "DEF",
  Midfielder: "MEI",
  Attacker: "ATA",
};

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchSquad(club) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://v3.football.api-sports.io/players/squads?team=${club.id}`, {
      headers: { "x-apisports-key": apiKey },
    });
    const payload = await response.json();
    const apiErrors = payload.errors ?? {};
    const hasApiErrors = Array.isArray(apiErrors) ? apiErrors.length > 0 : Object.keys(apiErrors).length > 0;
    const isRateLimited = response.status === 429 || /rate|limit|too many|requests/i.test(JSON.stringify(apiErrors));

    if (isRateLimited && attempt < 3) {
      const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "60");
      await wait(Math.max(60, retryAfterSeconds) * 1_000);
      continue;
    }

    if (!response.ok || hasApiErrors) {
      throw new Error(`API-Football falhou para ${club.nome}: HTTP ${response.status} (${JSON.stringify(apiErrors)}).`);
    }

    return payload.response?.[0]?.players;
  }

  throw new Error(`A API-Football excedeu o limite de tentativas para ${club.nome}.`);
}

const { data: clubs, error: clubsError } = await supabase
  .from("clubes")
  .select("id, nome")
  .eq("ativo", true)
  .not("logo_url", "is", null)
  .order("id");

if (clubsError) throw new Error(`Não foi possível consultar os clubes ativos: ${clubsError.message}`);
if (!clubs?.length) throw new Error("Não há clubes ativos para sincronizar.");

const playersByClub = new Map();

for (const [index, club] of clubs.entries()) {
  const squad = await fetchSquad(club);
  if (!Array.isArray(squad) || squad.length === 0) {
    throw new Error(`A API-Football não retornou elenco para ${club.nome}; sincronização cancelada sem desativar atletas.`);
  }

  const players = squad.map((player) => {
    const position = positionByApiName[player.position];
    if (!Number.isInteger(player.id) || !player.name?.trim() || !position) {
      throw new Error(`A API-Football retornou um jogador inválido para ${club.nome}; sincronização cancelada.`);
    }

    return {
      id: player.id,
      clube_id: club.id,
      nome: player.name.trim(),
      nome_exibicao: player.name.trim().slice(0, 16),
      numero: Number.isInteger(player.number) ? player.number : null,
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
    };
  });

  playersByClub.set(club.id, players);

  if (index < clubs.length - 1) await wait(6_100);
}

const players = [...playersByClub.values()].flat();
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
