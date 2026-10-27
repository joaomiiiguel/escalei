/**
 * Edge Function: advance-simulated-round
 *
 * Orquestrador do ciclo de vida da rodada simulada do Brasileirão.
 *
 * Executado periodicamente (cron), realiza em ordem:
 * 1. Abre a próxima rodada simulada quando a anterior está FECHADA e
 *    `abre_em` já passou — atualiza `configuracoes.rodada_simulada_atual`
 *    e inicializa o ranking via `fn_inicializar_ranking_rodada`.
 * 2. Trava a rodada aberta quando `trava_em` passa (status EM_ANDAMENTO),
 *    impedindo novas alterações de time.
 * 3. Encerra jogos pendentes cujo `inicio_simulado_em` já passou,
 *    consultando o status real na API-Football em lotes de até 20 jogos
 *    (com registro em `sync_execucoes` e orçamento diário de requisições).
 *    Jogos adiados ou cancelados na API deixam de ser consultados.
 * 4. Pontua cada jogo encerrado ainda não pontuado via `score-match`,
 *    respeitando a pausa crescente entre tentativas que falharam.
 * 5. Quando todos os jogos estão pontuados, agenda a conferência
 *    (60 min após o último jogo pontuado) e executa a segunda leitura
 *    de scouts (`conferencia = true`).
 * 6. Após a conferência, atualiza preços (`fn_atualizar_precos`),
 *    credita saldos (`fn_creditar_saldos_rodada`) e fecha a rodada.
 *
 * Trigger: POST chamado por cron externo ou manualmente.
 * Env obrigatórias: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                   API_FOOTBALL_SEASON.
 */
import { createClient } from "@supabase/supabase-js";
import { ApiAccessError, describeApiErrors, finishSyncExecution, QuotaReservedError, startSyncExecution } from "../_shared/api-football.ts";
import { chunk, DEFAULT_MAX_SCORING_ATTEMPTS, isDueForScoring } from "../_shared/retry.ts";

type Fixture = {
  fixture?: { id?: number; status?: { short?: string } };
  goals?: { home?: number | null; away?: number | null };
};

const finishedStatuses = new Set(["FT", "AET", "PEN"]);
const interruptedStatuses: Record<string, "ADIADO" | "CANCELADO"> = { PST: "ADIADO", SUSP: "ADIADO", CANC: "CANCELADO", ABD: "CANCELADO", AWD: "CANCELADO", WO: "CANCELADO" };

type ScoringCandidate = { id: number; pontuacao_tentativas: number | null; pontuacao_proxima_tentativa_em: string | null };

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });

  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const season = Number(Deno.env.get("API_FOOTBALL_SEASON") ?? "2024");
  if (!apiKey || !url || !serviceRoleKey || !Number.isInteger(season)) {
    return Response.json({ error: "Configuração da simulação incompleta." }, { status: 500 });
  }

  const db = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: config, error: configError } = await db.from("configuracoes")
    .select("valor").eq("chave", "rodada_simulada_atual").maybeSingle();
  let number = typeof config?.valor === "number" ? config.valor : Number(config?.valor);
  if (configError || !Number.isInteger(number)) return Response.json({ error: "Rodada simulada não configurada." }, { status: 500 });

  const { data: configuredRound, error: roundError } = await db.from("rodadas")
    .select("id, numero, status, trava_em, fechamento_simulado_em")
    .eq("temporada", season).eq("numero", number).eq("simulada", true).maybeSingle();
  if (roundError || !configuredRound) return Response.json({ error: "Rodada simulada não encontrada." }, { status: 404 });

  const now = new Date();
  let round = configuredRound;
  let openedRound: number | null = null;
  if (round.status === "FECHADA") {
    const { data: nextRound, error: nextRoundError } = await db.from("rodadas")
      .select("id, numero, status, trava_em, fechamento_simulado_em")
      .eq("temporada", season)
      .eq("simulada", true)
      .eq("status", "AGENDADA")
      .gt("numero", number)
      .lte("abre_em", now.toISOString())
      .order("numero")
      .limit(1)
      .maybeSingle();
    if (nextRoundError) return Response.json({ error: "Não foi possível localizar a próxima rodada." }, { status: 500 });

    if (nextRound) {
      const { error: openError } = await db.from("rodadas")
        .update({ status: "ABERTA" })
        .eq("id", nextRound.id)
        .eq("status", "AGENDADA");
      if (openError) return Response.json({ error: "Não foi possível abrir a próxima rodada." }, { status: 500 });

      const { error: configUpdateError } = await db.from("configuracoes")
        .update({ valor: nextRound.numero })
        .eq("chave", "rodada_simulada_atual");
      if (configUpdateError) return Response.json({ error: "Não foi possível atualizar a rodada ativa." }, { status: 500 });

      // Inicializar ranking_rodada para todos os membros de ligas ativas nesta rodada
      const { error: rankingInitError } = await db.rpc("fn_inicializar_ranking_rodada", { p_rodada_id: nextRound.id });
      if (rankingInitError) return Response.json({ error: "Não foi possível inicializar o ranking da rodada." }, { status: 500 });

      round = { ...nextRound, status: "ABERTA" };
      number = nextRound.numero;
      openedRound = nextRound.numero;
    }
  }
  if (round.status === "ABERTA" && now >= new Date(round.trava_em)) {
    const { error } = await db.from("rodadas").update({ status: "EM_ANDAMENTO" }).eq("id", round.id);
    if (error) return Response.json({ error: "Não foi possível travar a rodada." }, { status: 500 });
  }

  const { data: dueGames, error: dueGamesError } = await db.from("jogos")
    .select("id, api_football_id")
    .eq("rodada_id", round.id).eq("status", "A_JOGAR")
    .lte("inicio_simulado_em", now.toISOString())
    .order("inicio_simulado_em");
  if (dueGamesError) return Response.json({ error: "Não foi possível localizar os jogos pendentes." }, { status: 500 });

  const completed: number[] = [];
  const pending: number[] = [];
  let quotaReserved = false;
  const pollableGames = (dueGames ?? []).filter((game) => game.api_football_id);
  const execution = pollableGames.length
    ? await startSyncExecution(db, apiKey, "JOGO", `api-football:rodada-${number}:status`).catch(() => null)
    : null;
  if (pollableGames.length && !execution) return Response.json({ error: "Não foi possível registrar a sincronização." }, { status: 500 });
  let pollError: string | undefined;
  // Uma requisição consulta até 20 jogos (`/fixtures?ids=`).
  for (const batch of chunk(pollableGames)) {
    if (!execution) break;
    let fixtures: Fixture[];
    try {
      const { response, payload } = await execution.client.get(`/fixtures?ids=${batch.map((game) => game.api_football_id).join("-")}`);
      const apiErrors = describeApiErrors(payload);
      if (!response.ok || apiErrors || !Array.isArray(payload.response)) {
        pollError = `A API-Football não retornou o status dos jogos (HTTP ${response.status}${apiErrors ? `; ${apiErrors}` : ""}).`;
        pending.push(...batch.map((game) => game.id));
        continue;
      }
      fixtures = payload.response as Fixture[];
    } catch (error) {
      if (!(error instanceof QuotaReservedError) && !(error instanceof ApiAccessError)) throw error;
      quotaReserved = error instanceof QuotaReservedError;
      pollError = error.message;
      pending.push(...pollableGames.slice(pollableGames.indexOf(batch[0])).map((item) => item.id));
      break;
    }
    const fixtureByApiId = new Map(fixtures.map((fixture) => [fixture.fixture?.id, fixture]));
    for (const game of batch) {
      const fixture = fixtureByApiId.get(game.api_football_id);
      const status = fixture?.fixture?.status?.short ?? "";
      const interruptedStatus = interruptedStatuses[status];
      if (!fixture || (!finishedStatuses.has(status) && !interruptedStatus)) {
        pending.push(game.id);
        continue;
      }
      // Jogo adiado ou cancelado deixa de ser consultado; não recebe pontuação inventada.
      const update = interruptedStatus
        ? { status: interruptedStatus, status_api: status, api_atualizado_em: now.toISOString() }
        : { status: "ENCERRADO", status_api: status, gols_casa: fixture.goals?.home ?? 0, gols_fora: fixture.goals?.away ?? 0, api_atualizado_em: now.toISOString() };
      const { error: gameError } = await db.from("jogos").update(update).eq("id", game.id);
      if (gameError) {
        await finishSyncExecution(db, execution, "Não foi possível atualizar um jogo simulado.");
        return Response.json({ error: "Não foi possível atualizar um jogo simulado." }, { status: 500 });
      }
      if (!interruptedStatus) completed.push(game.id);
    }
  }
  if (execution) await finishSyncExecution(db, execution, pollError);

  const { data: maxAttemptsConfig } = await db.from("configuracoes").select("valor").eq("chave", "api_football_max_tentativas_pontuacao").maybeSingle();
  const maxAttempts = Number(maxAttemptsConfig?.valor ?? DEFAULT_MAX_SCORING_ATTEMPTS);

  /** Chama `score-match` só para jogos fora da pausa entre tentativas; para se faltar orçamento. */
  const scoreGames = async (candidates: ScoringCandidate[], conferencia: boolean) => {
    for (const game of candidates) {
      if (!isDueForScoring(game, now, maxAttempts)) {
        pending.push(game.id);
        continue;
      }
      const response = await fetch(`${url}/functions/v1/score-match`, {
        method: "POST",
        headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey, "Content-Type": "application/json" },
        body: JSON.stringify({ jogoId: game.id, conferencia }),
      });
      if (!response.ok) pending.push(game.id);
      if (response.status === 429) {
        quotaReserved = true;
        pending.push(...candidates.slice(candidates.indexOf(game) + 1).map((item) => item.id));
        break;
      }
    }
  };

  const { data: unscoredGames, error: unscoredError } = await db.from("jogos")
    .select("id, pontuacao_tentativas, pontuacao_proxima_tentativa_em").eq("rodada_id", round.id).eq("status", "ENCERRADO").is("pontuado_em", null);
  if (unscoredError) return Response.json({ error: "Não foi possível localizar jogos a pontuar." }, { status: 500 });
  if (!quotaReserved) await scoreGames((unscoredGames ?? []) as ScoringCandidate[], false);

  const { data: games, error: gamesError } = await db.from("jogos")
    .select("id, status, pontuado_em, conferido_em, pontuacao_tentativas, pontuacao_proxima_tentativa_em").eq("rodada_id", round.id);
  if (gamesError || !games) return Response.json({ error: "Não foi possível verificar o encerramento da rodada." }, { status: 500 });
  const allScored = games.length > 0 && games.every((game) => game.pontuado_em);
  let closeAt = round.fechamento_simulado_em;
  if (allScored && !closeAt) {
    const lastScoredAt = Math.max(
      // allScored garante que pontuado_em não é null neste ponto
      ...games.map((game) => new Date(game.pontuado_em!).getTime()),
    );
    closeAt = new Date(lastScoredAt + 60 * 60_000).toISOString();
    const { error } = await db.from("rodadas").update({ fechamento_simulado_em: closeAt }).eq("id", round.id);
    if (error) return Response.json({ error: "Não foi possível agendar a conferência da rodada." }, { status: 500 });
  }
  if (allScored && closeAt && now >= new Date(closeAt)) {
    if (!quotaReserved) {
      await scoreGames(games.filter((item) => !item.conferido_em && item.status === "ENCERRADO") as ScoringCandidate[], true);
    }
    const { data: unchecked } = await db.from("jogos").select("id").eq("rodada_id", round.id).is("conferido_em", null);
    if (!unchecked?.length) {
      const { error: priceError } = await db.rpc("fn_atualizar_precos", { p_rodada_id: round.id });
      if (priceError) return Response.json({ error: "A conferência foi concluída, mas não foi possível atualizar os preços." }, { status: 500 });

      const { error: balanceError } = await db.rpc("fn_creditar_saldos_rodada", { p_rodada_id: round.id });
      if (balanceError) return Response.json({ error: "A conferência foi concluída, mas não foi possível creditar os saldos." }, { status: 500 });

      const { error: closeError } = await db
        .from("rodadas")
        .update({ status: "FECHADA", fechada_em: now.toISOString() })
        .eq("id", round.id);
      if (closeError) return Response.json({ error: "Não foi possível fechar a rodada." }, { status: 500 });
    }
  }

  return Response.json({ rodada: number, rodadaAberta: openedRound, encerrados: completed, pendentes: [...new Set(pending)], conferenciaEm: closeAt ?? null, cotaReservada: quotaReserved });
});
