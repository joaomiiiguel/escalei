import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MOCK_SEASON = 2099;
const MOCK_ROUND = 3;
const LINEUP_PLAN = [
  { position: "GOL", gameState: "ENCERRADO" },
  { position: "DEF", gameState: "ENCERRADO" },
  { position: "DEF", gameState: "ENCERRADO" },
  { position: "MEI", gameState: "ENCERRADO" },
  { position: "DEF", gameState: "EM_ANDAMENTO" },
  { position: "MEI", gameState: "EM_ANDAMENTO" },
  { position: "ATA", gameState: "EM_ANDAMENTO" },
  { position: "DEF", gameState: "A_JOGAR" },
  { position: "MEI", gameState: "A_JOGAR" },
  { position: "ATA", gameState: "A_JOGAR" },
  { position: "ATA", gameState: "A_JOGAR" },
];

const { data: round, error: roundError } = await supabase
  .from("rodadas")
  .select("id")
  .eq("temporada", MOCK_SEASON)
  .eq("numero", MOCK_ROUND)
  .eq("status", "EM_ANDAMENTO")
  .maybeSingle();
if (roundError || !round) throw new Error("A rodada mock em andamento não foi encontrada. Execute primeiro seed:mock-live-round.");

const [{ data: profiles, error: profilesError }, { data: existingTeams, error: teamsError }, { data: games, error: gamesError }] = await Promise.all([
  supabase.from("perfis").select("id"),
  supabase.from("times").select("id, usuario_id").eq("rodada_id", round.id),
  supabase.from("jogos").select("id, clube_casa_id, clube_fora_id, status").eq("rodada_id", round.id),
]);
if (profilesError || teamsError || gamesError) throw new Error("Não foi possível consultar os dados necessários para a escalação mockada.");

const missingGameStates = ["ENCERRADO", "EM_ANDAMENTO", "A_JOGAR"].filter((status) => !(games ?? []).some((game) => game.status === status));
if (missingGameStates.length) throw new Error(`A rodada mock precisa conter jogos nos estados: ${missingGameStates.join(", ")}.`);

const clubIds = [...new Set((games ?? []).flatMap((game) => [game.clube_casa_id, game.clube_fora_id]))];
const { data: players, error: playersError } = await supabase
  .from("jogadores")
  .select("id, clube_id, posicao, preco")
  .eq("ativo", true)
  .in("clube_id", clubIds)
  .order("preco");
if (playersError) throw new Error(`Não foi possível consultar jogadores: ${playersError.message}`);

const clubIdsByGameState = new Map(["ENCERRADO", "EM_ANDAMENTO", "A_JOGAR"].map((status) => [
  status,
  new Set((games ?? []).filter((game) => game.status === status).flatMap((game) => [game.clube_casa_id, game.clube_fora_id])),
]));
const selectedPlayerIds = new Set();
const selectedPlayers = LINEUP_PLAN.map(({ position, gameState }) => {
  const eligibleClubIds = clubIdsByGameState.get(gameState);
  const player = (players ?? []).find((item) => item.posicao === position && eligibleClubIds?.has(item.clube_id) && !selectedPlayerIds.has(item.id));
  if (!player) throw new Error(`Não há jogador disponível para ${position} em jogo ${gameState}.`);
  selectedPlayerIds.add(player.id);
  return player;
});
const { data: scoredGoalkeeperStats, error: scoredGoalkeeperStatsError } = await supabase
  .from("estatisticas_jogador")
  .select("jogador_id, pontos, jogadores(posicao)")
  .eq("rodada_id", round.id)
  .gt("pontos", 0)
  .order("pontos", { ascending: false });
if (scoredGoalkeeperStatsError) throw new Error(`Não foi possível consultar goleiros pontuados: ${scoredGoalkeeperStatsError.message}`);
const playersById = new Map((players ?? []).map((player) => [player.id, player]));
const scoredGoalkeepers = (scoredGoalkeeperStats ?? []).flatMap((stat) => {
  const player = playersById.get(stat.jogador_id);
  const playerData = Array.isArray(stat.jogadores) ? stat.jogadores[0] : stat.jogadores;
  return player?.posicao === "GOL" && playerData?.posicao === "GOL" ? [player] : [];
});
if (scoredGoalkeepers.length < 2) throw new Error("São necessários pelo menos dois goleiros pontuados para variar o ranking mockado.");

const existingTeamsByUser = new Map((existingTeams ?? []).map((team) => [team.usuario_id, team]));
const profilesWithoutTeam = (profiles ?? []).filter((profile) => !existingTeamsByUser.has(profile.id));
if (profilesWithoutTeam.length) {
  const { data: createdTeams, error: createTeamsError } = await supabase
    .from("times")
    .insert(profilesWithoutTeam.map((profile) => ({ usuario_id: profile.id, rodada_id: round.id, formacao: "4-3-3", custo: cost, salvo_em: new Date().toISOString() })))
    .select("id, usuario_id");
  if (createTeamsError || !createdTeams) throw new Error(`Não foi possível criar os times mockados: ${createTeamsError?.message ?? "resposta vazia"}`);
  createdTeams.forEach((team) => existingTeamsByUser.set(team.usuario_id, team));
}

const targetTeams = [...existingTeamsByUser.values()];
if (!targetTeams.length) throw new Error("Não há perfis disponíveis para receber a escalação mockada.");
const targetTeamIds = targetTeams.map((team) => team.id);
const teamLineups = targetTeams.map((team, index) => {
  const goalkeeper = scoredGoalkeepers[index % scoredGoalkeepers.length];
  const playersForTeam = selectedPlayers.map((player) => player.posicao === "GOL" ? goalkeeper : player);
  const cost = playersForTeam.reduce((total, player) => total + Number(player.preco), 0);
  if (cost > 100) throw new Error(`A escalação mockada de ${team.usuario_id} excedeu o orçamento de C$ 100,00.`);
  return { team, players: playersForTeam, cost };
});
const updateTeamsResults = await Promise.all(teamLineups.map(({ team, cost }) => supabase
  .from("times")
  .update({ formacao: "4-3-3", custo: cost, salvo_em: new Date().toISOString() })
  .eq("id", team.id)));
if (updateTeamsResults.some(({ error }) => error)) throw new Error(`Não foi possível atualizar os times mockados: ${updateTeamsResults.find(({ error }) => error)?.error?.message}`);

const { error: clearLineupsError } = await supabase.from("times_jogadores").delete().in("time_id", targetTeamIds);
if (clearLineupsError) throw new Error(`Não foi possível substituir as escalações mockadas: ${clearLineupsError.message}`);

const lineupRows = teamLineups.flatMap(({ team, players: playersForTeam }) => playersForTeam.map((player) => ({
  time_id: team.id,
  jogador_id: player.id,
  posicao: player.posicao,
  preco_pago: player.preco,
})));
const { error: lineupError } = await supabase.from("times_jogadores").insert(lineupRows);
if (lineupError) throw new Error(`Não foi possível adicionar os jogadores escalados: ${lineupError.message}`);

const gamesByClub = new Map((games ?? []).flatMap((game) => [[game.clube_casa_id, game], [game.clube_fora_id, game]]));
const completedPlayers = selectedPlayers.filter((player) => gamesByClub.get(player.clube_id)?.status === "ENCERRADO");
const pendingPlayers = selectedPlayers.filter((player) => gamesByClub.get(player.clube_id)?.status !== "ENCERRADO");
const { error: clearPendingStatsError } = await supabase
  .from("estatisticas_jogador")
  .delete()
  .eq("rodada_id", round.id)
  .in("jogador_id", pendingPlayers.map((player) => player.id));
if (clearPendingStatsError) throw new Error(`Não foi possível remover avaliações pendentes: ${clearPendingStatsError.message}`);

const stats = completedPlayers.map((player, index) => {
  const game = gamesByClub.get(player.clube_id);
  if (!game) throw new Error("Jogador mockado sem jogo na rodada.");
  return {
    jogo_id: game.id,
    jogador_id: player.id,
    rodada_id: round.id,
    clube_id: player.clube_id,
    minutos: 90,
    posicao_jogo: player.posicao === "GOL" ? "G" : player.posicao === "DEF" ? "D" : player.posicao === "MEI" ? "M" : "F",
    pontos: 2.5 + (index % 5) * 1.3,
    desarmes: player.posicao === "DEF" ? 2 : 0,
    finalizacoes: player.posicao === "ATA" ? 2 : 0,
    lido_em: new Date().toISOString(),
  };
});
const { error: statsError } = await supabase.from("estatisticas_jogador").upsert(stats, { onConflict: "jogo_id,jogador_id" });
if (statsError) throw new Error(`Não foi possível gravar as pontuações da escalação mockada: ${statsError.message}`);

const { count: lineupCount, error: verificationError } = await supabase
  .from("times_jogadores")
  .select("jogador_id", { count: "exact", head: true })
  .in("time_id", targetTeamIds);
if (verificationError || lineupCount !== targetTeams.length * 11) throw new Error("A verificação dos jogadores escalados falhou.");

console.log(`${targetTeams.length} time(s) mockado(s) preparados com goleiros variados: 4 jogadores pontuados, 3 em andamento e 4 aguardando horário por escalação.`);
