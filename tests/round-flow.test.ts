import { describe, expect, it } from "vitest";
import { checkAtFor, dueRoundTransitions, gamesToScore, gameUpdateFromFixture, isRoundResolved, type FlowGame } from "@/supabase/functions/_shared/round-flow";

const NOW = new Date("2026-10-28T21:30:00Z");
const game = (overrides: Partial<FlowGame> = {}): FlowGame => ({
  id: 1, api_football_id: 10, status: "ENCERRADO", inicio_em: "2026-10-28T22:30:00Z",
  pontuado_em: null, conferido_em: null, pontuacao_tentativas: 0, pontuacao_proxima_tentativa_em: null, ...overrides,
});

describe("decisões do orquestrador de rodadas", () => {
  it("abre e trava pelos horários, inclusive na mesma passada", () => {
    expect(dueRoundTransitions({ status: "AGENDADA", abre_em: "2026-10-27T03:00:00Z", trava_em: "2026-10-28T22:00:00Z" }, NOW)).toEqual(["ABERTA"]);
    expect(dueRoundTransitions({ status: "AGENDADA", abre_em: "2026-10-27T03:00:00Z", trava_em: "2026-10-28T21:30:00Z" }, NOW)).toEqual(["ABERTA", "EM_ANDAMENTO"]);
    expect(dueRoundTransitions({ status: "ABERTA", abre_em: null, trava_em: "2026-10-28T21:31:00Z" }, NOW)).toEqual([]);
  });

  it("traduz o status da API e só grava placar em jogo iniciado", () => {
    expect(gameUpdateFromFixture({ status: "A_JOGAR" }, { fixture: { status: { short: "NS" } } }, "x")).toBeNull();
    expect(gameUpdateFromFixture({ status: "A_JOGAR" }, { fixture: { status: { short: "PST" } } }, "x")).toEqual({ status: "ADIADO", status_api: "PST", api_atualizado_em: "x" });
    expect(gameUpdateFromFixture({ status: "EM_ANDAMENTO" }, { fixture: { status: { short: "FT" } }, goals: { home: 2, away: null } }, "x")).toMatchObject({ status: "ENCERRADO", gols_casa: 2, gols_fora: 0 });
    expect(gameUpdateFromFixture({ status: "A_JOGAR" }, undefined, "x")).toBeNull();
  });

  it("respeita a pausa entre tentativas de pontuação", () => {
    const later = game({ id: 2, pontuacao_tentativas: 1, pontuacao_proxima_tentativa_em: "2026-10-28T22:00:00Z" });
    const { due, waiting } = gamesToScore([game(), later, game({ id: 3, status: "EM_ANDAMENTO" })], false, NOW, 10);
    expect(due.map((item) => item.id)).toEqual([1]);
    expect(waiting.map((item) => item.id)).toEqual([2]);
  });

  it("fecha só com todos os jogos resolvidos e confere 1 h depois do último", () => {
    const scored = [game({ pontuado_em: "2026-10-30T01:00:00Z" }), game({ id: 2, status: "ADIADO", pontuado_em: "2026-10-29T00:00:00Z" })];
    expect(isRoundResolved(scored)).toBe(true);
    expect(isRoundResolved([...scored, game({ id: 3 })])).toBe(false);
    expect(isRoundResolved([])).toBe(false);
    expect(checkAtFor(scored)).toBe("2026-10-30T02:00:00.000Z");
  });
});
