import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.API_FOOTBALL_KEY;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const season = Number(process.env.API_FOOTBALL_SEASON ?? "2024");
const roundNumber = Number(process.env.SIMULATION_ROUND ?? "30");
if (!apiKey || !url || !key) throw new Error("API_FOOTBALL_KEY e credenciais do Supabase são obrigatórias.");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const toPosition = (value) => ({ G: "GOL", D: "DEF", M: "MEI", F: "ATA" })[value] ?? null;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const { data: round, error: roundError } = await db.from("rodadas").select("id").eq("temporada", season).eq("numero", roundNumber).maybeSingle();
if (roundError || !round) throw new Error("Rodada não encontrada.");
const { data: games, error: gamesError } = await db.from("jogos").select("api_football_id, clube_casa_id, clube_fora_id").eq("rodada_id", round.id).not("api_football_id", "is", null);
if (gamesError || !games?.length) throw new Error("Jogos da rodada não encontrados.");
const clubIds = [...new Set(games.flatMap((game) => [game.clube_casa_id, game.clube_fora_id]))];
const [{ data: clubs, error: clubsError }, { data: saved, error: savedError }] = await Promise.all([
  db.from("clubes").select("id, api_football_id").in("id", clubIds),
  db.from("jogadores").select("id, api_football_id"),
]);
if (clubsError || savedError) throw new Error("Não foi possível preparar o catálogo da rodada.");
const clubIdByApiId = new Map((clubs ?? []).map((club) => [club.api_football_id, club.id]));
const playerIdByApiId = new Map((saved ?? []).flatMap((player) => player.api_football_id ? [[player.api_football_id, player.id]] : []));
const players = new Map();
for (const game of games) {
  const response = await fetch(`https://v3.football.api-sports.io/fixtures/players?fixture=${game.api_football_id}`, { headers: { "x-apisports-key": apiKey, Accept: "application/json" } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.response) || Object.keys(payload.errors ?? {}).length) throw new Error("A API-Football não retornou os elencos da rodada.");
  for (const group of payload.response) for (const entry of group.players ?? []) {
    const statistic = entry.statistics?.[0];
    const position = toPosition(statistic?.games?.position);
    const clubeId = clubIdByApiId.get(group.team?.id);
    if (!entry.player?.id || !entry.player?.name || !position || !clubeId) continue;
    const id = playerIdByApiId.get(entry.player.id) ?? 1_200_000_000 + entry.player.id;
    players.set(entry.player.id, { id, api_football_id: entry.player.id, clube_id: clubeId, nome: entry.player.name, nome_exibicao: entry.player.name.slice(0, 16), posicao: position, preco: 5, preco_inicial: 5, media_temporada: 0, media_ult5: 0, jogos_temporada: 0, status: "PROVAVEL", ativo: true, api_atualizado_em: new Date().toISOString() });
  }
  await wait(6_100);
}
const { error: upsertError } = await db.from("jogadores").upsert([...players.values()], { onConflict: "id" });
if (upsertError) throw new Error("Não foi possível gravar os elencos históricos.");
console.log(`Elencos históricos da rodada ${roundNumber} sincronizados: ${players.size} jogadores.`);
