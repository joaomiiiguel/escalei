/**
 * Edge Function: score-match
 *
 * Pontua um jogo encerrado a partir dos scouts da API-Football.
 *
 * - Recebe `jogoId` (interno) e o flag opcional `conferencia` via POST JSON.
 * - Busca estatísticas de jogadores e eventos do jogo na API-Football,
 *   registrando a execução em `sync_execucoes` e respeitando o orçamento
 *   diário de requisições (`_shared/api-football.ts`).
 * - Em caso de falha, registra a tentativa no jogo com pausa crescente até a
 *   próxima (`_shared/retry.ts`); o orquestrador respeita essa pausa.
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
import { buildScouts, type ApiEvent, type ApiPlayerGroup } from "../_shared/scouts.ts";
import { describeApiErrors, errorMessage, finishSyncExecution, QuotaReservedError, startSyncExecution, type ApiFootballPayload, type SyncExecution } from "../_shared/api-football.ts";
import { failedAttemptUpdate, successfulAttemptUpdate } from "../_shared/retry.ts";

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
    .select("id, rodada_id, api_football_id, clube_casa_id, clube_fora_id, gols_casa, gols_fora, status, pontuacao_tentativas")
    .eq("id", jogoId)
    .maybeSingle();

  if (jogoError || !jogo?.api_football_id) {
    return Response.json({ error: "Jogo não encontrado ou sem identificador da API-Football." }, { status: 404 });
  }
  if (jogo.status !== "ENCERRADO") {
    return Response.json({ error: "A pontuação só pode ser lida após o encerramento do jogo." }, { status: 409 });
  }

  /** Registra a falha no jogo (pausa crescente até a próxima tentativa) e responde. */
  const fail = async (status: number, message: string) => {
    await supabase.from("jogos").update(failedAttemptUpdate(jogo.pontuacao_tentativas ?? 0, message, new Date())).eq("id", jogo.id);
    return Response.json({ error: message }, { status });
  };

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
      // Falta de orçamento não é falha do jogo: tenta de novo quando houver cota.
      await finishSyncExecution(supabase, execution, error.message);
      return Response.json({ error: "Pontuação adiada para preservar a cota diária da API-Football." }, { status: 429 });
    }
    const message = errorMessage(error, "Falha ao consultar os scouts na API-Football.");
    await finishSyncExecution(supabase, execution, message);
    return fail(502, message);
  }
  const playerGroups = playersPayload.response as ApiPlayerGroup[] | undefined;
  const events = eventsPayload.response as ApiEvent[] | undefined;
  const apiErrors = describeApiErrors(playersPayload) ?? describeApiErrors(eventsPayload);
  if (!playersResponse.ok || !eventsResponse.ok || !Array.isArray(playerGroups) || !Array.isArray(events) || apiErrors) {
    const message = `A API-Football não retornou os scouts da partida (HTTP ${playersResponse.status}/${eventsResponse.status}${apiErrors ? `; ${apiErrors}` : ""}).`;
    await finishSyncExecution(supabase, execution, message);
    return fail(502, message);
  }
  await finishSyncExecution(supabase, execution);

  const playerApiIds = playerGroups.flatMap((group) => group.players.map((player) => player.player.id));
  const teamApiIds = playerGroups.map((group) => group.team.id);
  const [{ data: jogadores, error: jogadoresError }, { data: clubes, error: clubesError }] = await Promise.all([
    supabase.from("jogadores").select("id, api_football_id").in("api_football_id", playerApiIds),
    supabase.from("clubes").select("id, api_football_id").in("api_football_id", teamApiIds),
  ]);
  if (jogadoresError || clubesError) return fail(500, "Não foi possível relacionar os scouts ao catálogo local.");

  const scouts = buildScouts({
    jogo,
    playerGroups,
    events,
    jogadorIdByApiId: new Map((jogadores ?? []).map((jogador) => [jogador.api_football_id, jogador.id])),
    clubeIdByApiId: new Map((clubes ?? []).map((clube) => [clube.api_football_id, clube.id])),
    conferencia,
    lidoEm: new Date().toISOString(),
  });

  if (scouts.length === 0) return fail(422, `Nenhum scout pôde ser associado aos jogadores locais (${playerGroups.length} times na resposta da API).`);
  const { error: scoutsError } = await supabase
    .from("estatisticas_jogador")
    .upsert(scouts, { onConflict: "jogo_id,jogador_id" });
  if (scoutsError) return fail(500, "Não foi possível gravar os scouts.");

  const { error: scoreError } = await supabase.rpc("fn_pontuar_jogo", { p_jogo_id: jogo.id });
  if (scoreError) return fail(500, "Os scouts foram gravados, mas o cálculo falhou.");

  const { error: checkedError } = await supabase
    .from("jogos")
    .update({ ...successfulAttemptUpdate, ...(conferencia ? { conferido_em: new Date().toISOString() } : {}) })
    .eq("id", jogo.id);
  if (checkedError) return Response.json({ error: "Pontuação calculada, mas a conferência não foi registrada." }, { status: 500 });

  return Response.json({ jogoId: jogo.id, scouts: scouts.length, conferencia, pontuado: true });
});
