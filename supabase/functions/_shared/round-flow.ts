/**
 * Decisões do orquestrador `advance-round` (JOA-147), separadas do acesso ao
 * banco e à API para serem testadas com Vitest (JOA-51). O orquestrador só
 * lê, aplica estas regras e grava.
 *
 * Este módulo não usa globais do Deno.
 */
import { STATUS_BY_API, type GameStatus, type RoundStatus } from "./calendar.ts";
import { isDueForScoring } from "./retry.ts";

export type FlowRound = { status: string; abre_em: string | null; trava_em: string };
export type FlowGame = {
  id: number;
  api_football_id: number | null;
  status: string;
  inicio_em: string;
  pontuado_em: string | null;
  conferido_em: string | null;
  pontuacao_tentativas: number | null;
  pontuacao_proxima_tentativa_em: string | null;
};
export type FlowFixture = { fixture?: { id?: number; status?: { short?: string } }; goals?: { home?: number | null; away?: number | null } };

/** A conferência (segunda leitura dos scouts) acontece 1 h depois do último jogo pontuado. */
export const CHECK_DELAY_MINUTES = 60;
const INTERRUPTED = new Set(["ADIADO", "CANCELADO"]);

export const isInterrupted = (game: Pick<FlowGame, "status">) => INTERRUPTED.has(game.status);

/** Mudanças de status que já venceram: abre por `abre_em` e trava por `trava_em`, na mesma passada se for o caso. */
export function dueRoundTransitions(round: FlowRound, now: Date): RoundStatus[] {
  const transitions: RoundStatus[] = [];
  let status = round.status;
  if (status === "AGENDADA" && round.abre_em && now >= new Date(round.abre_em)) {
    transitions.push("ABERTA");
    status = "ABERTA";
  }
  if (status === "ABERTA" && now >= new Date(round.trava_em)) transitions.push("EM_ANDAMENTO");
  return transitions;
}

/** Só consulta a API para jogos que já começaram e ainda não terminaram. */
export function gamesToPoll(games: FlowGame[], now: Date): FlowGame[] {
  return games.filter((game) => game.api_football_id && ["A_JOGAR", "EM_ANDAMENTO"].includes(game.status) && new Date(game.inicio_em) <= now);
}

/**
 * Atualização do jogo a partir de `/fixtures?ids=`, ou `null` quando a API
 * não trouxe o jogo, trouxe um status desconhecido ou ele ainda não começou.
 */
export function gameUpdateFromFixture(game: Pick<FlowGame, "status">, fixture: FlowFixture | undefined, nowIso: string) {
  const apiStatus = fixture?.fixture?.status?.short ?? "";
  const status: GameStatus | undefined = STATUS_BY_API[apiStatus];
  if (!fixture || !status || status === game.status && status === "A_JOGAR") return null;
  const update: { status: GameStatus; status_api: string; api_atualizado_em: string; gols_casa?: number; gols_fora?: number } = { status, status_api: apiStatus, api_atualizado_em: nowIso };
  if (status === "EM_ANDAMENTO" || status === "ENCERRADO") {
    update.gols_casa = fixture.goals?.home ?? 0;
    update.gols_fora = fixture.goals?.away ?? 0;
  }
  return update;
}

/** Adiados e cancelados ainda não resolvidos: pontuam 0 e deixam de bloquear o fechamento. */
export function interruptedToSettle(games: FlowGame[]): FlowGame[] {
  return games.filter((game) => isInterrupted(game) && (!game.pontuado_em || !game.conferido_em));
}

/** Encerrados a pontuar (primeira leitura) ou a conferir (segunda leitura), respeitando a pausa entre tentativas. */
export function gamesToScore(games: FlowGame[], conferencia: boolean, now: Date, maxAttempts: number): { due: FlowGame[]; waiting: FlowGame[] } {
  const candidates = games.filter((game) => game.status === "ENCERRADO" && !(conferencia ? game.conferido_em : game.pontuado_em));
  const due = candidates.filter((game) => isDueForScoring(game, now, maxAttempts));
  return { due, waiting: candidates.filter((game) => !due.includes(game)) };
}

/** Todos os jogos da rodada pontuados (encerrados) ou resolvidos como adiados/cancelados. */
export function isRoundResolved(games: FlowGame[]): boolean {
  return games.length > 0 && games.every((game) => game.pontuado_em && (game.status === "ENCERRADO" || isInterrupted(game)));
}

/** Momento da conferência: 1 h depois do último jogo pontuado. */
export function checkAtFor(games: FlowGame[]): string {
  const lastScoredAt = Math.max(...games.map((game) => new Date(game.pontuado_em!).getTime()));
  return new Date(lastScoredAt + CHECK_DELAY_MINUTES * 60_000).toISOString();
}
