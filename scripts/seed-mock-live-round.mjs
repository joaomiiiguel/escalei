import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const now = new Date();
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1_000).toISOString();
const MOCK_SEASON = 2099;
const MOCK_ROUND = 3;
const GAME_IDS = [993_000, 993_001, 993_002, 993_003];

const { data: clubs, error: clubsError } = await supabase
  .from("clubes")
  .select("id, nome, sigla")
  .eq("ativo", true)
  .not("logo_url", "is", null)
  .order("nome")
  .limit(8);

if (clubsError) throw new Error(`Não foi possível consultar clubes: ${clubsError.message}`);
if (!clubs || clubs.length < 8) throw new Error("São necessários oito clubes ativos com escudo para criar a rodada mockada.");

const { data: round, error: roundError } = await supabase
  .from("rodadas")
  .upsert({
    temporada: MOCK_SEASON,
    numero: MOCK_ROUND,
    rotulo_api: "MOCK — Rodada em andamento",
    status: "EM_ANDAMENTO",
    abre_em: hoursFromNow(-72),
    trava_em: hoursFromNow(-24),
    fechada_em: null,
    versao_regras: 1,
  }, { onConflict: "temporada,numero" })
  .select("id, rotulo_api, status")
  .single();

if (roundError || !round) throw new Error(`Não foi possível gravar a rodada mockada: ${roundError?.message ?? "resposta vazia"}`);

const games = [
  { id: GAME_IDS[0], rodada_id: round.id, clube_casa_id: clubs[0].id, clube_fora_id: clubs[1].id, inicio_em: hoursFromNow(-28), status: "ENCERRADO", status_api: "MOCK", gols_casa: 2, gols_fora: 1, pontuado_em: hoursFromNow(-26), conferido_em: hoursFromNow(-26) },
  { id: GAME_IDS[1], rodada_id: round.id, clube_casa_id: clubs[2].id, clube_fora_id: clubs[3].id, inicio_em: hoursFromNow(-5), status: "ENCERRADO", status_api: "MOCK", gols_casa: 0, gols_fora: 0, pontuado_em: hoursFromNow(-3), conferido_em: hoursFromNow(-3) },
  { id: GAME_IDS[2], rodada_id: round.id, clube_casa_id: clubs[4].id, clube_fora_id: clubs[5].id, inicio_em: hoursFromNow(-1), status: "EM_ANDAMENTO", status_api: "MOCK", gols_casa: 1, gols_fora: 0, pontuado_em: null, conferido_em: null },
  { id: GAME_IDS[3], rodada_id: round.id, clube_casa_id: clubs[6].id, clube_fora_id: clubs[7].id, inicio_em: hoursFromNow(4), status: "A_JOGAR", status_api: "MOCK", gols_casa: null, gols_fora: null, pontuado_em: null, conferido_em: null },
];

const { error: gamesError } = await supabase.from("jogos").upsert(games, { onConflict: "id" });
if (gamesError) throw new Error(`Não foi possível gravar os jogos mockados: ${gamesError.message}`);

const { data: players, error: playersError } = await supabase
  .from("jogadores")
  .select("id, clube_id, posicao")
  .in("clube_id", clubs.map((club) => club.id))
  .eq("ativo", true)
  .order("preco");

if (playersError) throw new Error(`Não foi possível consultar jogadores: ${playersError.message}`);

const playersByClub = new Map(clubs.map((club) => [club.id, (players ?? []).filter((player) => player.clube_id === club.id).slice(0, 3)]));
const clubsWithoutPlayers = clubs.filter((club) => (playersByClub.get(club.id)?.length ?? 0) < 3);
if (clubsWithoutPlayers.length) throw new Error(`Clubes sem jogadores suficientes: ${clubsWithoutPlayers.map((club) => club.sigla).join(", ")}`);

const stat = (game, club, player, values) => ({
  jogo_id: game.id,
  jogador_id: player.id,
  rodada_id: round.id,
  clube_id: club.id,
  minutos: values.minutos ?? 90,
  posicao_jogo: player.posicao === "GOL" ? "G" : player.posicao === "DEF" ? "D" : player.posicao === "MEI" ? "M" : "F",
  pontos: values.pontos,
  gols: values.gols ?? 0,
  assistencias: values.assistencias ?? 0,
  finalizacoes: values.finalizacoes ?? 0,
  finalizacoes_no_gol: values.finalizacoes_no_gol ?? 0,
  desarmes: values.desarmes ?? 0,
  defesas: values.defesas ?? 0,
  gols_sofridos: values.gols_sofridos ?? 0,
  sem_sofrer_gol: values.sem_sofrer_gol ?? false,
  lido_em: now.toISOString(),
});

const stats = [
  stat(games[0], clubs[0], playersByClub.get(clubs[0].id)[0], { pontos: 12.4, gols: 1, finalizacoes: 3, finalizacoes_no_gol: 2 }),
  stat(games[0], clubs[0], playersByClub.get(clubs[0].id)[1], { pontos: 7.1, assistencias: 1, desarmes: 2 }),
  stat(games[0], clubs[1], playersByClub.get(clubs[1].id)[0], { pontos: 8.6, gols: 1, finalizacoes: 2, finalizacoes_no_gol: 1 }),
  stat(games[0], clubs[1], playersByClub.get(clubs[1].id)[1], { pontos: 3.2, desarmes: 3 }),
  stat(games[1], clubs[2], playersByClub.get(clubs[2].id)[0], { pontos: 9.5, defesas: 5, sem_sofrer_gol: true }),
  stat(games[1], clubs[2], playersByClub.get(clubs[2].id)[1], { pontos: 5.8, desarmes: 4, sem_sofrer_gol: true }),
  stat(games[1], clubs[3], playersByClub.get(clubs[3].id)[0], { pontos: 8.9, defesas: 4, sem_sofrer_gol: true }),
  stat(games[1], clubs[3], playersByClub.get(clubs[3].id)[1], { pontos: 4.7, desarmes: 3, sem_sofrer_gol: true }),
];

const { error: clearStatsError } = await supabase
  .from("estatisticas_jogador")
  .delete()
  .eq("rodada_id", round.id)
  .in("jogo_id", GAME_IDS);
if (clearStatsError) throw new Error(`Não foi possível limpar avaliações mockadas: ${clearStatsError.message}`);

const { error: statsError } = await supabase.from("estatisticas_jogador").upsert(stats, { onConflict: "jogo_id,jogador_id" });
if (statsError) throw new Error(`Não foi possível gravar as pontuações mockadas: ${statsError.message}`);

const injuredPlayers = [playersByClub.get(clubs[0].id)[2], playersByClub.get(clubs[3].id)[2], playersByClub.get(clubs[5].id)[2]];
const { error: injuryError } = await supabase
  .from("jogadores")
  .update({ status: "LESIONADO", status_motivo: "Indisponível para a rodada mockada" })
  .in("id", injuredPlayers.map((player) => player.id));
if (injuryError) throw new Error(`Não foi possível marcar jogadores lesionados: ${injuryError.message}`);

const [{ count: gamesCount, error: gamesVerificationError }, { count: statsCount, error: statsVerificationError }, { count: injuriesCount, error: injuriesVerificationError }] = await Promise.all([
  supabase.from("jogos").select("id", { count: "exact", head: true }).eq("rodada_id", round.id).in("id", GAME_IDS),
  supabase.from("estatisticas_jogador").select("jogador_id", { count: "exact", head: true }).eq("rodada_id", round.id).in("jogo_id", GAME_IDS),
  supabase.from("jogadores").select("id", { count: "exact", head: true }).in("id", injuredPlayers.map((player) => player.id)).eq("status", "LESIONADO"),
]);

if (gamesVerificationError || gamesCount !== games.length) throw new Error("A verificação dos jogos mockados falhou.");
if (statsVerificationError || statsCount !== stats.length) throw new Error("A verificação das pontuações mockadas falhou.");
if (injuriesVerificationError || injuriesCount !== injuredPlayers.length) throw new Error("A verificação dos jogadores lesionados falhou.");

console.log(`${round.rotulo_api} pronta: ${gamesCount} jogos (${games.filter((game) => game.status === "ENCERRADO").length} encerrados), ${statsCount} pontuações e ${injuriesCount} lesionados.`);
