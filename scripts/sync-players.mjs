import { createClient } from "@supabase/supabase-js";

const apiKey = process.env.API_FOOTBALL_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const season = Number(process.env.API_FOOTBALL_SEASON ?? "2024");
if (!apiKey || !supabaseUrl || !serviceRoleKey) throw new Error("API_FOOTBALL_KEY, NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fantasyPosition = (value) => ({ Goalkeeper: "GOL", Defender: "DEF", Midfielder: "MEI", Attacker: "ATA" })[value] ?? null;
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
async function playersFor(club) {
  const all = [];
  for (let page = 1, total = 1; page <= total; page += 1) {
    const response = await fetch(`https://v3.football.api-sports.io/players?team=${club.api_football_id}&season=${season}&page=${page}`, { headers: { "x-apisports-key": apiKey, Accept: "application/json" } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !Array.isArray(body.response) || Object.keys(body.errors ?? {}).length) {
      const detail = typeof body.errors === "string" ? body.errors : Object.values(body.errors ?? {}).join("; ");
      throw new Error(`API-Football não retornou jogadores para ${club.nome}: HTTP ${response.status}${detail ? ` (${detail})` : ""}.`);
    }
    all.push(...body.response);
    const availablePages = Number(body.paging?.total ?? 1);
    total = Math.min(availablePages, 3);
    if (availablePages > 3) console.warn(`${club.nome}: a API-Football Free limita a carga às primeiras 3 páginas de jogadores.`);
    if (page < total) await wait(6_100);
  }
  return all;
}

const { data: clubs, error: clubsError } = await supabase.from("clubes").select("id, nome, api_football_id").eq("ativo", true).not("api_football_id", "is", null).order("id");
if (clubsError || !clubs?.length) throw new Error("Não há clubes ativos mapeados para a API-Football.");
const { data: saved, error: savedError } = await supabase.from("jogadores").select("id, clube_id, nome, api_football_id");
if (savedError) throw new Error("Não foi possível consultar jogadores existentes.");
const byApiId = new Map((saved ?? []).flatMap((player) => player.api_football_id ? [[player.api_football_id, player]] : []));
const byName = new Map((saved ?? []).map((player) => [`${player.clube_id}:${normalize(player.nome)}`, player]));
const players = [];
for (const [index, club] of clubs.entries()) {
  for (const entry of await playersFor(club)) {
    const statistic = entry.statistics?.find((item) => item.team?.id === club.api_football_id);
    const position = fantasyPosition(statistic?.games?.position);
    if (!entry.player?.id || !entry.player.name?.trim() || !position) continue;
    const existing = byApiId.get(entry.player.id) ?? byName.get(`${club.id}:${normalize(entry.player.name)}`);
    players.push({ id: existing?.id ?? 1_200_000_000 + entry.player.id, api_football_id: entry.player.id, clube_id: club.id, nome: entry.player.name.trim(), nome_exibicao: entry.player.name.trim().slice(0, 16), numero: Number.isInteger(entry.player.number) ? entry.player.number : null, posicao: position, preco: 5, preco_inicial: 5, media_temporada: 0, media_ult5: 0, jogos_temporada: 0, status: "PROVAVEL", status_motivo: null, ativo: true, api_atualizado_em: new Date().toISOString() });
  }
  if (index < clubs.length - 1) await wait(6_100);
}
if (!players.length) throw new Error("API-Football não retornou jogadores com posição utilizável.");
const { error } = await supabase.from("jogadores").upsert(players, { onConflict: "id" });
if (error) throw new Error(`Não foi possível gravar jogadores: ${error.message}`);
console.log(`Elencos sincronizados: ${players.length} jogadores da Série A ${season}, via API-Football.`);
