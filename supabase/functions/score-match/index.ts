/**
 * Edge Function: score-match
 *
 * Pontua um jogo encerrado a partir dos scouts da API-Football.
 *
 * - Recebe `jogoId` (interno) e o flag opcional `conferencia` via POST JSON.
 * - Busca estatísticas de jogadores e eventos do jogo na API-Football,
 *   registrando a execução em `sync_execucoes` e respeitando a reserva diária
 *   de requisições (`_shared/api-football.ts`).
 * - Relaciona jogadores e clubes com o catálogo local e calcula scouts
 *   (gols, assistências, defesas, cartões, etc.).
 * - Faz upsert em `estatisticas_jogador` e chama `fn_pontuar_jogo` para
 *   calcular a pontuação de fantasy de cada escalado.
 * - Quando `conferencia = true`, registra `conferido_em` no jogo (segunda
 *   leitura de conferição após o prazo configurado).
 *
 * Trigger: POST chamado por `advance-simulated-round` ou manualmente.
 * Env obrigatórias: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { finishSyncExecution, QuotaReservedError, startSyncExecution, type ApiFootballPayload, type SyncExecution } from "../_shared/api-football.ts";

type ApiPlayerStatistic = {
  player: { id: number };
  statistics: Array<{
    games?: { minutes?: number | null; position?: string | null; substitute?: boolean | null; rating?: string | null };
    goals?: { total?: number | null; assists?: number | null; saves?: number | null; conceded?: number | null };
    shots?: { total?: number | null; on?: number | null };
    tackles?: { total?: number | null };
    fouls?: { drawn?: number | null; committed?: number | null };
    offsides?: number | null;
    cards?: { yellow?: number | null; red?: number | null };
    penalty?: { won?: number | null; committed?: number | null; missed?: number | null; saved?: number | null };
  }>;
};

type ApiPlayerGroup = { team: { id: number }; players: ApiPlayerStatistic[] };
type ApiEvent = { type?: string; detail?: string; player?: { id?: number | null } };

const numberOrZero = (value: number | null | undefined) => Number.isFinite(value) ? Number(value) : 0;
const gamePosition = (value: string | null | undefined) => {
  const normalized = value?.toUpperCase();
  return normalized === "G" || normalized === "D" || normalized === "M" || normalized === "F" ? normalized : null;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Configuração da API-Football incompleta." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const jogoId = Number(body.jogoId);
  const conferencia = body.conferencia === true;
  if (!Number.isInteger(jogoId)) return Response.json({ error: "jogoId inválido." }, { status: 400 });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: jogo, error: jogoError } = await supabase
    .from("jogos")
    .select("id, rodada_id, api_football_id, clube_casa_id, clube_fora_id, gols_casa, gols_fora, status")
    .eq("id", jogoId)
    .maybeSingle();

  if (jogoError || !jogo?.api_football_id) {
    return Response.json({ error: "Jogo não encontrado ou sem identificador da API-Football." }, { status: 404 });
  }
  if (jogo.status !== "ENCERRADO") {
    return Response.json({ error: "A pontuação só pode ser lida após o encerramento do jogo." }, { status: 409 });
  }

  let execution: SyncExecution;
  try {
    execution = await startSyncExecution(supabase, apiKey, "PONTUACAO", `api-football:fixture-${jogo.api_football_id}${conferencia ? ":conferencia" : ""}`);
  } catch {
    return Response.json({ error: "Não foi possível registrar a sincronização." }, { status: 500 });
  }

  let playersResponse: Response, eventsResponse: Response, playersPayload: ApiFootballPayload, eventsPayload: ApiFootballPayload;
  try {
    ({ response: playersResponse, payload: playersPayload } = await execution.client.get(`/fixtures/players?fixture=${jogo.api_football_id}`));
    ({ response: eventsResponse, payload: eventsPayload } = await execution.client.get(`/fixtures/events?fixture=${jogo.api_football_id}`));
  } catch (error) {
    if (error instanceof QuotaReservedError) {
      await finishSyncExecution(supabase, execution, error.message);
      return Response.json({ error: "Pontuação adiada para preservar a cota diária da API-Football." }, { status: 429 });
    }
    await finishSyncExecution(supabase, execution, "Falha ao consultar os scouts na API-Football.");
    return Response.json({ error: "A API-Football não retornou os scouts da partida." }, { status: 502 });
  }
  const playerGroups = playersPayload.response as ApiPlayerGroup[] | undefined;
  const events = eventsPayload.response as ApiEvent[] | undefined;
  if (!playersResponse.ok || !eventsResponse.ok || !Array.isArray(playerGroups) || !Array.isArray(events) || Object.keys(playersPayload.errors ?? {}).length || Object.keys(eventsPayload.errors ?? {}).length) {
    await finishSyncExecution(supabase, execution, "A API-Football não retornou os scouts da partida.");
    return Response.json({ error: "A API-Football não retornou os scouts da partida." }, { status: 502 });
  }
  await finishSyncExecution(supabase, execution);

  const playerApiIds = playerGroups.flatMap((group) => group.players.map((player) => player.player.id));
  const teamApiIds = playerGroups.map((group) => group.team.id);
  const [{ data: jogadores, error: jogadoresError }, { data: clubes, error: clubesError }] = await Promise.all([
    supabase.from("jogadores").select("id, api_football_id").in("api_football_id", playerApiIds),
    supabase.from("clubes").select("id, api_football_id").in("api_football_id", teamApiIds),
  ]);
  if (jogadoresError || clubesError) return Response.json({ error: "Não foi possível relacionar os scouts ao catálogo local." }, { status: 500 });

  const jogadorIdByApiId = new Map((jogadores ?? []).map((jogador) => [jogador.api_football_id, jogador.id]));
  const clubeIdByApiId = new Map((clubes ?? []).map((clube) => [clube.api_football_id, clube.id]));
  const ownGoalsByPlayerApiId = new Map<number, number>();
  for (const event of events) {
    if (event.type === "Goal" && event.detail === "Own Goal" && event.player?.id) {
      ownGoalsByPlayerApiId.set(event.player.id, (ownGoalsByPlayerApiId.get(event.player.id) ?? 0) + 1);
    }
  }

  const scouts = playerGroups.flatMap((group) => group.players.flatMap((player) => {
    const localPlayerId = jogadorIdByApiId.get(player.player.id);
    const localClubId = clubeIdByApiId.get(group.team.id);
    const stat = player.statistics[0];
    if (!localPlayerId || !localClubId || !stat) return [];
    const minutes = numberOrZero(stat.games?.minutes);
    const goalsConceded = numberOrZero(stat.goals?.conceded);
    const isHome = localClubId === jogo.clube_casa_id;
    const opponentGoals = isHome ? numberOrZero(jogo.gols_fora) : numberOrZero(jogo.gols_casa);
    return [{
      jogo_id: jogo.id,
      jogador_id: localPlayerId,
      rodada_id: jogo.rodada_id,
      clube_id: localClubId,
      minutos: minutes,
      posicao_jogo: gamePosition(stat.games?.position),
      substituto: stat.games?.substitute === true,
      nota_api: stat.games?.rating ? Number(stat.games.rating) : null,
      gols: numberOrZero(stat.goals?.total),
      assistencias: numberOrZero(stat.goals?.assists),
      finalizacoes: numberOrZero(stat.shots?.total),
      finalizacoes_no_gol: numberOrZero(stat.shots?.on),
      desarmes: numberOrZero(stat.tackles?.total),
      faltas_sofridas: numberOrZero(stat.fouls?.drawn),
      faltas_cometidas: numberOrZero(stat.fouls?.committed),
      impedimentos: numberOrZero(stat.offsides),
      amarelos: numberOrZero(stat.cards?.yellow),
      vermelhos: numberOrZero(stat.cards?.red),
      defesas: numberOrZero(stat.goals?.saves),
      gols_sofridos: goalsConceded,
      penaltis_sofridos: numberOrZero(stat.penalty?.won),
      penaltis_cometidos: numberOrZero(stat.penalty?.committed),
      penaltis_perdidos: numberOrZero(stat.penalty?.missed),
      penaltis_defendidos: numberOrZero(stat.penalty?.saved),
      gols_contra: ownGoalsByPlayerApiId.get(player.player.id) ?? 0,
      sem_sofrer_gol: minutes >= 60 && opponentGoals === 0,
      versao_leitura: conferencia ? 2 : 1,
      payload_api: player,
      lido_em: new Date().toISOString(),
    }];
  }));

  if (scouts.length === 0) return Response.json({ error: "Nenhum scout pôde ser associado aos jogadores locais." }, { status: 422 });
  const { error: scoutsError } = await supabase
    .from("estatisticas_jogador")
    .upsert(scouts, { onConflict: "jogo_id,jogador_id" });
  if (scoutsError) return Response.json({ error: "Não foi possível gravar os scouts." }, { status: 500 });

  const { error: scoreError } = await supabase.rpc("fn_pontuar_jogo", { p_jogo_id: jogo.id });
  if (scoreError) return Response.json({ error: "Os scouts foram gravados, mas o cálculo falhou." }, { status: 500 });

  if (conferencia) {
    const { error: checkedError } = await supabase
      .from("jogos")
      .update({ conferido_em: new Date().toISOString() })
      .eq("id", jogo.id);
    if (checkedError) return Response.json({ error: "Pontuação calculada, mas a conferência não foi registrada." }, { status: 500 });
  }

  return Response.json({ jogoId: jogo.id, scouts: scouts.length, conferencia, pontuado: true });
});
