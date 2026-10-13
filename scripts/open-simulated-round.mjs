import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const season = Number(process.env.API_FOOTBALL_SEASON ?? "2024");
const roundNumber = Number(process.env.SIMULATION_ROUND ?? "30");
const lockMinutes = Number(process.env.SIMULATION_LOCK_MINUTES ?? "90");
if (!url || !key || !Number.isInteger(season) || !Number.isInteger(roundNumber) || !Number.isInteger(lockMinutes) || lockMinutes < 5) {
  throw new Error("Configuração de simulação inválida.");
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: round, error: roundError } = await db
  .from("rodadas")
  .select("id")
  .eq("temporada", season)
  .eq("numero", roundNumber)
  .eq("simulada", true)
  .maybeSingle();
if (roundError || !round) throw new Error("Rodada simulada não encontrada. Sincronize a rodada antes de abri-la.");

const opensAt = new Date();
const lockAt = new Date(opensAt.getTime() + lockMinutes * 60_000);
const { data: games, error: gamesError } = await db
  .from("jogos")
  .select("id")
  .eq("rodada_id", round.id)
  .order("inicio_em");
if (gamesError || !games?.length) throw new Error("Não há jogos para abrir na rodada simulada.");

const { error: updateRoundError } = await db
  .from("rodadas")
  .update({ status: "ABERTA", abre_em: opensAt.toISOString(), trava_em: lockAt.toISOString(), fechada_em: null, inicio_simulado_em: opensAt.toISOString(), fechamento_simulado_em: null })
  .eq("id", round.id);
if (updateRoundError) throw new Error("Não foi possível abrir a rodada simulada.");

const { error: updateGamesError } = await Promise.all(games.map((game, index) => db
  .from("jogos")
  .update({ status: "A_JOGAR", gols_casa: null, gols_fora: null, pontuado_em: null, conferido_em: null, inicio_simulado_em: new Date(lockAt.getTime() + index * 2 * 60 * 60_000).toISOString() })
  .eq("id", game.id))).then((results) => ({ error: results.find((result) => result.error)?.error }));
if (updateGamesError) throw new Error("A rodada abriu, mas não foi possível preparar os jogos simulados.");

console.log(`Rodada ${roundNumber} aberta até ${lockAt.toISOString()} com ${games.length} jogos simulados.`);
