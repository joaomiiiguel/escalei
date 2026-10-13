import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const season = Number(process.env.API_FOOTBALL_SEASON ?? "2024");
const roundNumber = Number(process.env.SIMULATION_ROUND ?? "30");
if (!url || !key) throw new Error("Credenciais do Supabase são obrigatórias.");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const { data: round, error: roundError } = await db
  .from("rodadas")
  .select("id")
  .eq("temporada", season)
  .eq("numero", roundNumber)
  .eq("simulada", true)
  .maybeSingle();
if (roundError || !round) throw new Error("Rodada simulada não encontrada.");

const [{ data: historicPlayers, error: historicError }, { data: teams, error: teamsError }] = await Promise.all([
  db.from("jogadores").select("id, clube_id, nome_exibicao, posicao").not("api_football_id", "is", null),
  db.from("times").select("id, times_jogadores(jogador_id, posicao, jogadores(id, clube_id, nome_exibicao, api_football_id))").eq("rodada_id", round.id),
]);
if (historicError || teamsError) throw new Error("Não foi possível ler o catálogo ou as escalações da rodada.");

const historicIdByIdentity = new Map((historicPlayers ?? []).map((player) => [
  `${player.clube_id}:${player.posicao}:${normalize(player.nome_exibicao)}`,
  player.id,
]));
const updates = [];
for (const team of teams ?? []) for (const lineup of team.times_jogadores ?? []) {
  const player = Array.isArray(lineup.jogadores) ? lineup.jogadores[0] : lineup.jogadores;
  if (!player || player.api_football_id) continue;
  const historicId = historicIdByIdentity.get(`${player.clube_id}:${lineup.posicao}:${normalize(player.nome_exibicao)}`);
  if (historicId && historicId !== lineup.jogador_id) updates.push({ timeId: team.id, oldPlayerId: lineup.jogador_id, historicId });
}

for (const update of updates) {
  const { error } = await db.from("times_jogadores")
    .update({ jogador_id: update.historicId })
    .eq("time_id", update.timeId)
    .eq("jogador_id", update.oldPlayerId);
  if (error) throw new Error("Não foi possível atualizar uma escalação para o catálogo histórico.");
}

const { error: deactivateError } = await db.from("jogadores")
  .update({ ativo: false })
  .is("api_football_id", null)
  .eq("ativo", true);
if (deactivateError) throw new Error("Não foi possível retirar o catálogo antigo do mercado.");

const { count: activeHistoric, error: countError } = await db.from("jogadores")
  .select("id", { count: "exact", head: true })
  .not("api_football_id", "is", null)
  .eq("ativo", true);
if (countError) throw new Error("Não foi possível validar o catálogo consolidado.");
console.log(JSON.stringify({ rodada: roundNumber, migrados: updates.length, mercadoHistorico: activeHistoric }));
