import { describe, expect, it } from "vitest";
import { chunk, failedAttemptUpdate, isDueForScoring, retryDelayMinutes, successfulAttemptUpdate } from "@/supabase/functions/_shared/retry";

const now = new Date("2026-10-27T12:00:00Z");

describe("pausa entre tentativas de pontuação", () => {
  it("dobra a espera a cada falha até 60 minutos", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 10].map(retryDelayMinutes)).toEqual([2, 4, 8, 16, 32, 60, 60, 60]);
  });

  it("registra a falha com a próxima tentativa e o erro", () => {
    expect(failedAttemptUpdate(2, "A API-Football recusou o acesso", now)).toEqual({
      pontuacao_tentativas: 3,
      pontuacao_proxima_tentativa_em: "2026-10-27T12:08:00.000Z",
      pontuacao_ultimo_erro: "A API-Football recusou o acesso",
    });
  });

  it("zera as tentativas depois de um sucesso", () => {
    expect(successfulAttemptUpdate).toEqual({ pontuacao_tentativas: 0, pontuacao_proxima_tentativa_em: null, pontuacao_ultimo_erro: null });
  });

  it("só tenta de novo depois da pausa e até o limite de tentativas", () => {
    expect(isDueForScoring({ pontuacao_tentativas: 0, pontuacao_proxima_tentativa_em: null }, now)).toBe(true);
    expect(isDueForScoring({ pontuacao_tentativas: 3, pontuacao_proxima_tentativa_em: "2026-10-27T12:05:00Z" }, now)).toBe(false);
    expect(isDueForScoring({ pontuacao_tentativas: 3, pontuacao_proxima_tentativa_em: "2026-10-27T11:59:00Z" }, now)).toBe(true);
    expect(isDueForScoring({ pontuacao_tentativas: 10, pontuacao_proxima_tentativa_em: null }, now)).toBe(false);
    expect(isDueForScoring({ pontuacao_tentativas: 4, pontuacao_proxima_tentativa_em: null }, now, 4)).toBe(false);
  });

  it("limita as tentativas de um jogo travado a poucas dezenas de requisições por dia", () => {
    // Antes: 720 tentativas/dia (a cada 2 min). Agora: 10 tentativas no total.
    const minutesUntilGiveUp = Array.from({ length: 9 }, (_, index) => retryDelayMinutes(index + 1)).reduce((total, delay) => total + delay, 0);
    expect(minutesUntilGiveUp).toBe(302);
  });
});

describe("consulta de status em lote", () => {
  it("divide os jogos em lotes de até 20", () => {
    const ids = Array.from({ length: 45 }, (_, index) => index + 1);
    expect(chunk(ids).map((batch) => batch.length)).toEqual([20, 20, 5]);
    expect(chunk([])).toEqual([]);
  });
});
