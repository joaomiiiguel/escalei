/**
 * Pausa entre tentativas de pontuação de um jogo que falhou: 2, 4, 8, 16, 32
 * e depois 60 minutos. Depois do limite de tentativas o jogo fica parado
 * até alguém zerar `pontuacao_tentativas`.
 *
 * Este módulo não usa globais do Deno para poder ser testado com Vitest.
 */

export const DEFAULT_MAX_SCORING_ATTEMPTS = 10;
const FIRST_DELAY_MINUTES = 2;
const MAX_DELAY_MINUTES = 60;

/** Minutos de espera depois da tentativa número `attempts` (a partir de 1). */
export function retryDelayMinutes(attempts: number): number {
  return Math.min(MAX_DELAY_MINUTES, FIRST_DELAY_MINUTES * 2 ** Math.max(0, attempts - 1));
}

export function nextRetryAt(attempts: number, now: Date): string {
  return new Date(now.getTime() + retryDelayMinutes(attempts) * 60_000).toISOString();
}

/** Atualização do jogo depois de uma tentativa de pontuação que falhou. */
export function failedAttemptUpdate(previousAttempts: number, error: string, now: Date) {
  const attempts = previousAttempts + 1;
  return {
    pontuacao_tentativas: attempts,
    pontuacao_proxima_tentativa_em: nextRetryAt(attempts, now),
    pontuacao_ultimo_erro: error.slice(0, 500),
  };
}

/** Atualização do jogo depois de uma tentativa que deu certo. */
export const successfulAttemptUpdate = {
  pontuacao_tentativas: 0,
  pontuacao_proxima_tentativa_em: null,
  pontuacao_ultimo_erro: null,
} as const;

/** Um jogo pode ser tentado agora? */
export function isDueForScoring(
  game: { pontuacao_tentativas: number | null; pontuacao_proxima_tentativa_em: string | null },
  now: Date,
  maxAttempts = DEFAULT_MAX_SCORING_ATTEMPTS,
): boolean {
  if ((game.pontuacao_tentativas ?? 0) >= maxAttempts) return false;
  return !game.pontuacao_proxima_tentativa_em || new Date(game.pontuacao_proxima_tentativa_em).getTime() <= now.getTime();
}

/** Divide ids em lotes (a API aceita até 20 jogos em `/fixtures?ids=`). */
export function chunk<T>(items: T[], size = 20): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}
