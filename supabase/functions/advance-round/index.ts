/**
 * Edge Function: advance-round
 *
 * Orquestrador das rodadas reais da temporada (JOA-147), executado a cada 2 min:
 * 1. AGENDADA → ABERTA quando `abre_em` passa (inicializa o ranking da rodada).
 * 2. ABERTA → EM_ANDAMENTO quando `trava_em` passa (bloqueia escalações e
 *    consome os passes de rodada; JOA-152).
 *    Enquanto a rodada está aberta, atualiza lesionados e suspensos
 *    (`/injuries`, a cada 6 h e uma vez nas 2 h antes da trava; JOA-163).
 * 3. Jogos já iniciados e não encerrados: status e placar em lotes de até 20
 *    (`/fixtures?ids=`). Fora das janelas de jogo não há consulta à API.
 * 4. Jogos encerrados: pontuação via `score-match`, com pausa crescente entre
 *    tentativas que falham (`_shared/retry.ts`).
 * 5. Jogos adiados ou cancelados: os jogadores pontuam 0 (Regras do Jogo) e o
 *    jogo deixa de bloquear o fechamento.
 * 6. Com todos os jogos resolvidos, agenda a conferência para 1 h depois do
 *    último jogo pontuado; após a segunda leitura, atualiza preços, credita
 *    saldos, estorna os passes se a rodada foi cancelada por inteiro e a fecha. A próxima rodada abre pelo próprio `abre_em`.
 *
 * Trigger: cron a cada 2 min e POST manual.
 * Env obrigatórias: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *                   API_FOOTBALL_SEASON.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiAccessError, describeApiErrors, finishSyncExecution, QuotaReservedError, startSyncExecution } from "../_shared/api-football.ts";
import { chunk, DEFAULT_MAX_SCORING_ATTEMPTS } from "../_shared/retry.ts";
import {
  checkAtFor,
  dueRoundTransitions,
  gamesToPoll,
  gamesToScore,
  gameUpdateFromFixture,
  interruptedToSettle,
  isRoundResolved,
  type FlowFixture as Fixture,
  type FlowGame as Game,
} from "../_shared/round-flow.ts";
import { type ApiInjury, buildPlayerStatuses, injuriesSyncDue } from "../_shared/injuries.ts";

type Round = { id: number; numero: number; status: string; abre_em: string | null; trava_em: string; fechamento_simulado_em: string | null };

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });
  const apiKey = Deno.env.get("API_FOOTBALL_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const season = Number(Deno.env.get("API_FOOTBALL_SEASON"));
  if (!apiKey || !url || !serviceRoleKey || !Number.isInteger(season)) {
    return Response.json({ error: "Configuração do orquestrador incompleta." }, { status: 500 });
  }
  const db = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const now = new Date();
  const summary = { abertas: [] as number[], travadas: [] as number[], encerrados: [] as number[], pendentes: [] as number[], fechadas: [] as number[], lesoes: null as number | null, cotaReservada: false };

  const { data: roundsData, error: roundsError } = await db.from("rodadas")
    .select("id, numero, status, abre_em, trava_em, fechamento_simulado_em")
    .eq("temporada", season).eq("simulada", false).neq("status", "FECHADA").order("numero");
  if (roundsError) return Response.json({ error: "Não foi possível ler as rodadas." }, { status: 500 });
  const rounds = (roundsData ?? []) as Round[];

  // 1 e 2: abertura e trava pelos horários oficiais.
  for (const round of rounds) {
    for (const next of dueRoundTransitions(round, now)) {
      if (next === "ABERTA") {
        const { error } = await db.from("rodadas").update({ status: "ABERTA" }).eq("id", round.id).eq("status", "AGENDADA");
        if (error) return Response.json({ error: `Não foi possível abrir a rodada ${round.numero}.` }, { status: 500 });
        const { error: rankingError } = await db.rpc("fn_inicializar_ranking_rodada", { p_rodada_id: round.id });
        if (rankingError) return Response.json({ error: `Não foi possível inicializar o ranking da rodada ${round.numero}.` }, { status: 500 });
        summary.abertas.push(round.numero);
      } else {
        // Antes do status: `trava_em` já bloqueia o time, e uma falha aqui é refeita na próxima passada.
        const { error: passesError } = await db.rpc("fn_consumir_passes_rodada", { p_rodada_id: round.id });
        if (passesError) return Response.json({ error: `Não foi possível consumir os passes da rodada ${round.numero}.` }, { status: 500 });
        const { error } = await db.from("rodadas").update({ status: "EM_ANDAMENTO" }).eq("id", round.id).eq("status", "ABERTA");
        if (error) return Response.json({ error: `Não foi possível travar a rodada ${round.numero}.` }, { status: 500 });
        summary.travadas.push(round.numero);
      }
      round.status = next;
    }
  }

  const openRound = rounds.find((round) => round.status === "ABERTA");
  if (openRound) {
    const result = await syncInjuries(db, { round: openRound, now, apiKey, summary });
    if (result) return result;
  }

  const { data: maxAttemptsConfig } = await db.from("configuracoes").select("valor").eq("chave", "api_football_max_tentativas_pontuacao").maybeSingle();
  const maxAttempts = Number(maxAttemptsConfig?.valor ?? DEFAULT_MAX_SCORING_ATTEMPTS);

  for (const round of rounds.filter((item) => item.status === "EM_ANDAMENTO")) {
    const result = await advanceLiveRound(db, { round, now, apiKey, url, serviceRoleKey, maxAttempts, summary });
    if (result) return result;
    if (summary.cotaReservada) break;
  }

  return Response.json({ temporada: season, ...summary, pendentes: [...new Set(summary.pendentes)] });
});

/** Lesionados e suspensos da rodada aberta, quando for a hora. Devolve uma resposta só em caso de erro. */
async function syncInjuries(
  db: SupabaseClient,
  context: { round: Round; now: Date; apiKey: string; summary: { lesoes: number | null; cotaReservada: boolean } },
): Promise<Response | null> {
  const { round, now, summary } = context;
  const referencia = `api-football:rodada-${round.numero}:lesoes`;
  const lastRun = (onlySuccess: boolean) => {
    const query = db.from("sync_execucoes").select("iniciado_em").eq("tipo", "LESOES").eq("referencia", referencia);
    return (onlySuccess ? query.eq("sucesso", true) : query).order("iniciado_em", { ascending: false }).limit(1).maybeSingle();
  };
  const [{ data: lastSuccess }, { data: lastAttempt }] = await Promise.all([lastRun(true), lastRun(false)]);
  const history = { lastSuccessAt: lastSuccess?.iniciado_em ?? null, lastAttemptAt: lastAttempt?.iniciado_em ?? null };
  if (!injuriesSyncDue(round, history, now)) return null;

  const { data: gamesData, error: gamesError } = await db.from("jogos").select("api_football_id").eq("rodada_id", round.id);
  if (gamesError) return Response.json({ error: `Não foi possível ler os jogos da rodada ${round.numero}.` }, { status: 500 });
  const ids = (gamesData ?? []).map((game) => game.api_football_id).filter((id): id is number => Number.isInteger(id));
  if (!ids.length) return null;

  const execution = await startSyncExecution(db, context.apiKey, "LESOES", referencia).catch(() => null);
  if (!execution) return Response.json({ error: "Não foi possível registrar a sincronização." }, { status: 500 });
  let injuries: ApiInjury[] = [];
  for (const batch of chunk(ids)) {
    try {
      const { response, payload } = await execution.client.get(`/injuries?ids=${batch.join("-")}`);
      const apiErrors = describeApiErrors(payload);
      if (!response.ok || apiErrors || !Array.isArray(payload.response)) {
        // Sem a lista completa, não zera ninguém: tenta de novo na próxima passada.
        await finishSyncExecution(db, execution, `A API-Football não retornou os desfalques (HTTP ${response.status}${apiErrors ? `; ${apiErrors}` : ""}).`);
        return null;
      }
      injuries = injuries.concat(payload.response as ApiInjury[]);
    } catch (error) {
      if (!(error instanceof QuotaReservedError) && !(error instanceof ApiAccessError)) throw error;
      summary.cotaReservada = error instanceof QuotaReservedError;
      await finishSyncExecution(db, execution, error.message);
      return null;
    }
  }

  const { data: changed, error } = await db.rpc("fn_aplicar_status_jogadores", { p_status: buildPlayerStatuses(injuries) });
  if (error) {
    await finishSyncExecution(db, execution, "Não foi possível gravar os desfalques.");
    return Response.json({ error: "Não foi possível gravar os desfalques." }, { status: 500 });
  }
  await finishSyncExecution(db, execution);
  summary.lesoes = Number(changed ?? 0);
  return null;
}

/** Etapas 3 a 6 para uma rodada em andamento. Devolve uma resposta só em caso de erro. */
async function advanceLiveRound(
  db: SupabaseClient,
  context: {
    round: Round;
    now: Date;
    apiKey: string;
    url: string;
    serviceRoleKey: string;
    maxAttempts: number;
    summary: { encerrados: number[]; pendentes: number[]; fechadas: number[]; cotaReservada: boolean };
  },
): Promise<Response | null> {
  const { round, now, summary } = context;
  const nowIso = now.toISOString();
  const loadGames = async () => {
    const { data, error } = await db.from("jogos")
      .select("id, api_football_id, status, inicio_em, pontuado_em, conferido_em, pontuacao_tentativas, pontuacao_proxima_tentativa_em")
      .eq("rodada_id", round.id);
    return error ? null : (data ?? []) as Game[];
  };
  let games = await loadGames();
  if (!games) return Response.json({ error: `Não foi possível ler os jogos da rodada ${round.numero}.` }, { status: 500 });

  // 3: só consulta a API para jogos que já começaram e ainda não terminaram.
  const live = gamesToPoll(games, now);
  if (live.length) {
    const execution = await startSyncExecution(db, context.apiKey, "JOGO", `api-football:rodada-${round.numero}:status`).catch(() => null);
    if (!execution) return Response.json({ error: "Não foi possível registrar a sincronização." }, { status: 500 });
    let pollError: string | undefined;
    for (const batch of chunk(live)) {
      let fixtures: Fixture[];
      try {
        const { response, payload } = await execution.client.get(`/fixtures?ids=${batch.map((game) => game.api_football_id).join("-")}`);
        const apiErrors = describeApiErrors(payload);
        if (!response.ok || apiErrors || !Array.isArray(payload.response)) {
          pollError = `A API-Football não retornou o status dos jogos (HTTP ${response.status}${apiErrors ? `; ${apiErrors}` : ""}).`;
          summary.pendentes.push(...batch.map((game) => game.id));
          continue;
        }
        fixtures = payload.response as Fixture[];
      } catch (error) {
        if (!(error instanceof QuotaReservedError) && !(error instanceof ApiAccessError)) throw error;
        summary.cotaReservada = error instanceof QuotaReservedError;
        pollError = error.message;
        summary.pendentes.push(...batch.map((game) => game.id));
        break;
      }
      const byApiId = new Map(fixtures.map((fixture) => [fixture.fixture?.id, fixture]));
      for (const game of batch) {
        const update = gameUpdateFromFixture(game, byApiId.get(game.api_football_id!), nowIso);
        if (!update) {
          summary.pendentes.push(game.id);
          continue;
        }
        const { error } = await db.from("jogos").update(update).eq("id", game.id);
        if (error) {
          await finishSyncExecution(db, execution, "Não foi possível atualizar um jogo.");
          return Response.json({ error: "Não foi possível atualizar um jogo." }, { status: 500 });
        }
        if (update.status === "ENCERRADO") summary.encerrados.push(game.id);
      }
    }
    await finishSyncExecution(db, execution, pollError);
    games = await loadGames();
    if (!games) return Response.json({ error: `Não foi possível ler os jogos da rodada ${round.numero}.` }, { status: 500 });
  }

  // 5: adiados e cancelados pontuam 0 e não bloqueiam o fechamento.
  for (const game of interruptedToSettle(games)) {
    if (!game.pontuado_em) {
      const { error } = await db.rpc("fn_pontuar_jogo", { p_jogo_id: game.id });
      if (error) return Response.json({ error: "Não foi possível registrar o jogo adiado." }, { status: 500 });
    }
    const { error } = await db.from("jogos").update({ conferido_em: nowIso }).eq("id", game.id);
    if (error) return Response.json({ error: "Não foi possível registrar o jogo adiado." }, { status: 500 });
  }

  // 4: pontuação dos encerrados, respeitando a pausa entre tentativas.
  const scoreGames = async (conferencia: boolean) => {
    const { due, waiting } = gamesToScore(games!, conferencia, now, context.maxAttempts);
    summary.pendentes.push(...waiting.map((game) => game.id));
    for (const game of due) {
      if (summary.cotaReservada) break;
      const response = await fetch(`${context.url}/functions/v1/score-match`, {
        method: "POST",
        headers: { Authorization: `Bearer ${context.serviceRoleKey}`, apikey: context.serviceRoleKey, "Content-Type": "application/json" },
        body: JSON.stringify({ jogoId: game.id, conferencia }),
      });
      if (!response.ok) summary.pendentes.push(game.id);
      if (response.status === 429) summary.cotaReservada = true;
    }
  };
  await scoreGames(false);

  // 6: conferência e fechamento.
  games = await loadGames();
  if (!games) return Response.json({ error: `Não foi possível ler os jogos da rodada ${round.numero}.` }, { status: 500 });
  if (!isRoundResolved(games)) return null;
  let checkAt = round.fechamento_simulado_em;
  if (!checkAt) {
    checkAt = checkAtFor(games);
    const { error } = await db.from("rodadas").update({ fechamento_simulado_em: checkAt }).eq("id", round.id);
    if (error) return Response.json({ error: "Não foi possível agendar a conferência da rodada." }, { status: 500 });
  }
  if (now < new Date(checkAt)) return null;

  await scoreGames(true);
  const { data: unchecked } = await db.from("jogos").select("id").eq("rodada_id", round.id).is("conferido_em", null);
  if (unchecked?.length) return null;

  const { error: priceError } = await db.rpc("fn_atualizar_precos", { p_rodada_id: round.id });
  if (priceError) return Response.json({ error: "A conferência foi concluída, mas não foi possível atualizar os preços." }, { status: 500 });
  const { error: balanceError } = await db.rpc("fn_creditar_saldos_rodada", { p_rodada_id: round.id });
  if (balanceError) return Response.json({ error: "A conferência foi concluída, mas não foi possível creditar os saldos." }, { status: 500 });
  const { error: refundError } = await db.rpc("fn_estornar_passes_rodada", { p_rodada_id: round.id });
  if (refundError) return Response.json({ error: "A conferência foi concluída, mas não foi possível estornar os passes." }, { status: 500 });
  const { error: closeError } = await db.from("rodadas").update({ status: "FECHADA", fechada_em: nowIso }).eq("id", round.id);
  if (closeError) return Response.json({ error: "Não foi possível fechar a rodada." }, { status: 500 });
  summary.fechadas.push(round.numero);
  return null;
}
