/**
 * Edge Function: sync-round
 *
 * Sincroniza a rodada simulada atual com a API-Football.
 *
 * - Lê o número da rodada ativa em `configuracoes.rodada_simulada_atual`.
 * - Busca os 10 jogos da rodada na API-Football (liga + temporada configuradas via env).
 * - Faz upsert na tabela `rodadas` e na tabela `jogos`, mapeando clubes e
 *   status para os valores internos do sistema.
 * - Registra a execução em `sync_execucoes` com status de sucesso ou erro.
 *
 * Trigger: chamada manualmente ou por cron (ex.: supabase schedule).
 * Env obrigatórias: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                   API_FOOTBALL_LEAGUE_ID, API_FOOTBALL_SEASON.
 */
import { createClient } from "@supabase/supabase-js";

type ApiFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  teams: { home: { id: number }; away: { id: number } };
  goals: { home: number | null; away: number | null };
};

const statusByApi: Record<string, "A_JOGAR" | "EM_ANDAMENTO" | "ENCERRADO" | "ADIADO" | "CANCELADO"> = {
  TBD: "A_JOGAR", NS: "A_JOGAR", "1H": "EM_ANDAMENTO", HT: "EM_ANDAMENTO", "2H": "EM_ANDAMENTO", ET: "EM_ANDAMENTO", BT: "EM_ANDAMENTO", P: "EM_ANDAMENTO", INT: "EM_ANDAMENTO", LIVE: "EM_ANDAMENTO", FT: "ENCERRADO", AET: "ENCERRADO", PEN: "ENCERRADO", PST: "ADIADO", SUSP: "ADIADO", CANC: "CANCELADO", ABD: "CANCELADO", AWD: "CANCELADO", WO: "CANCELADO",
};

Deno.serve(async () => {
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const leagueId = Number(Deno.env.get("API_FOOTBALL_LEAGUE_ID") ?? "71");
  const season = Number(Deno.env.get("API_FOOTBALL_SEASON") ?? "2024");
  if (!apiKey || !supabaseUrl || !serviceRoleKey || !Number.isInteger(leagueId) || !Number.isInteger(season)) {
    return Response.json({ error: "Configuração da API-Football incompleta." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: simulationConfig, error: simulationConfigError } = await supabase
    .from("configuracoes")
    .select("valor")
    .eq("chave", "rodada_simulada_atual")
    .maybeSingle();
  const simulationRound = typeof simulationConfig?.valor === "number" ? simulationConfig.valor : Number(simulationConfig?.valor);
  if (simulationConfigError || !Number.isInteger(simulationRound) || simulationRound < 1 || simulationRound > 38) {
    return Response.json({ error: "A rodada simulada não está configurada." }, { status: 500 });
  }
  const startedAt = new Date().toISOString();
  const { data: execution, error: executionError } = await supabase
    .from("sync_execucoes")
    .insert({ tipo: "RODADA", referencia: `api-football:${season}:rodada-${simulationRound}`, iniciado_em: startedAt, requisicoes: 0, sucesso: false })
    .select("id")
    .single();
  if (executionError || !execution) return Response.json({ error: "Não foi possível registrar a sincronização." }, { status: 500 });

  try {
    const roundName = `Regular Season - ${simulationRound}`;
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&round=${encodeURIComponent(roundName)}`, {
      headers: { "x-apisports-key": apiKey, Accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    const matches = payload.response as ApiFixture[] | undefined;
    if (!response.ok || !Array.isArray(matches) || Object.keys(payload.errors ?? {}).length || matches.length !== 10) {
      throw new Error(`A API-Football não retornou os 10 jogos da rodada ${simulationRound}.`);
    }

    const externalClubIds = [...new Set(matches.flatMap((match) => [match.teams.home.id, match.teams.away.id]))];
    const { data: clubs, error: clubsError } = await supabase.from("clubes").select("id, api_football_id").in("api_football_id", externalClubIds).eq("ativo", true);
    if (clubsError || clubs?.length !== 20) throw new Error("Os clubes da rodada ainda não foram sincronizados pela API-Football.");
    const clubIdByApiId = new Map(clubs.map((club) => [club.api_football_id, club.id]));
    const starts = matches.map((match) => new Date(match.fixture.date)).sort((a, b) => a.getTime() - b.getTime());
    const { data: round, error: roundError } = await supabase.from("rodadas").upsert({
      temporada: season, numero: simulationRound, rotulo_api: roundName, simulada: true, status: "EM_ANDAMENTO", abre_em: starts[0].toISOString(), trava_em: starts[0].toISOString(), fechada_em: null, versao_regras: 1,
    }, { onConflict: "temporada,numero" }).select("id").single();
    if (roundError || !round) throw new Error("Não foi possível gravar a rodada simulada.");

    const { data: previousGames, error: previousGamesError } = await supabase.from("jogos").select("id, api_football_id").in("api_football_id", matches.map((match) => match.fixture.id));
    if (previousGamesError) throw new Error("Não foi possível consultar partidas existentes.");
    const internalIdByApiId = new Map((previousGames ?? []).map((game) => [game.api_football_id, game.id]));
    const games = matches.map((match) => {
      const status = statusByApi[match.fixture.status.short];
      if (!status) throw new Error(`Status da API-Football sem mapeamento: ${match.fixture.status.short}.`);
      return { id: internalIdByApiId.get(match.fixture.id) ?? 1_500_000_000 + match.fixture.id, api_football_id: match.fixture.id, rodada_id: round.id, clube_casa_id: clubIdByApiId.get(match.teams.home.id), clube_fora_id: clubIdByApiId.get(match.teams.away.id), inicio_em: match.fixture.date, status, status_api: match.fixture.status.short, gols_casa: match.goals.home, gols_fora: match.goals.away, api_atualizado_em: new Date().toISOString() };
    });
    const { error: gamesError } = await supabase.from("jogos").upsert(games, { onConflict: "id" });
    if (gamesError) throw new Error("Não foi possível gravar as partidas da rodada.");

    await supabase.from("sync_execucoes").update({ terminado_em: new Date().toISOString(), requisicoes: 1, sucesso: true }).eq("id", execution.id);
    return Response.json({ rodada: simulationRound, jogos: games.length, fonte: "API-Football" });
  } catch (error) {
    await supabase.from("sync_execucoes").update({ terminado_em: new Date().toISOString(), requisicoes: 1, sucesso: false, erro: "Falha na sincronização da rodada via API-Football." }).eq("id", execution.id);
    console.error(error);
    return Response.json({ error: "A sincronização da rodada falhou." }, { status: 500 });
  }
});
