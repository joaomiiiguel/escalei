import { describe, expect, it } from "vitest";
import { pickAutoLineup, type AutoLineupCandidate } from "@/lib/auto-lineup";
import { fitsBudget, remainingBudget, sumPrices, toCents, validateLineup, type Position } from "@/lib/lineup-rules";

/** Preços que somam exatamente C$ 60, mas dão 60,00000000000001 em ponto flutuante. */
const EXACT_60 = [2.5, 3.8, 8.5, 9.8, 3.2, 9.4, 6.1, 3, 3.7, 6.8, 3.2];

describe("dinheiro em centavos", () => {
  it("soma sem erro de ponto flutuante", () => {
    expect(EXACT_60.reduce((total, price) => total + price, 0)).toBeGreaterThan(60);
    expect(sumPrices(EXACT_60)).toBe(60);
    expect(toCents("7.10")).toBe(710);
  });

  it("aceita custo igual ao saldo e recusa um centavo acima", () => {
    expect(fitsBudget(sumPrices(EXACT_60), 60)).toBe(true);
    expect(fitsBudget(60.01, 60)).toBe(false);
  });

  it("calcula o saldo restante em duas casas", () => {
    expect(remainingBudget(60, EXACT_60)).toBe(0);
    expect(remainingBudget(60, [5.1, 7.3])).toBe(47.6);
    expect(remainingBudget(60, [30, -5.1])).toBe(35.1);
  });

  it("valida escalação de exatamente C$ 60", () => {
    const positions: Position[] = ["GOL", "DEF", "DEF", "DEF", "DEF", "MEI", "MEI", "MEI", "ATA", "ATA", "ATA"];
    expect(validateLineup("4-3-3", positions.map((posicao, index) => ({ posicao, preco: EXACT_60[index] })), 60)).toBeNull();
  });
});

describe("escalação automática", () => {
  const player = (id: number, position: Position, price: number, score: number): AutoLineupCandidate => ({ id, name: `J${id}`, position, price, score });
  const pool = (position: Position, prices: number[], firstId: number) => prices.map((price, index) => player(firstId + index, position, price, price * 1.5));

  it("monta o time de exatamente C$ 60 que antes era recusado", () => {
    const candidates = [
      player(1, "GOL", 2.5, 1),
      player(2, "DEF", 3.8, 1), player(3, "DEF", 8.5, 1), player(4, "DEF", 9.8, 1), player(5, "DEF", 3.2, 1),
      player(6, "MEI", 9.4, 1), player(7, "MEI", 6.1, 1), player(8, "MEI", 3, 1),
      player(9, "ATA", 3.7, 1), player(10, "ATA", 6.8, 1), player(11, "ATA", 3.2, 1),
    ];
    const result = pickAutoLineup(candidates, "4-3-3", 60);
    expect(result).toMatchObject({ ok: true, cost: 60 });
    if (result.ok) expect(fitsBudget(sumPrices(result.players.map((item) => item.price)), 60)).toBe(true);
  });

  it("melhora o time até o limite do saldo sem passar dele", () => {
    const candidates = [
      ...pool("GOL", [2, 4, 9], 100),
      ...pool("DEF", [2, 2.1, 2.2, 2.3, 5.5, 6.6, 9.9, 12], 200),
      ...pool("MEI", [2, 2.1, 2.2, 7.7, 8.8, 11.1], 300),
      ...pool("ATA", [2, 2.1, 2.2, 9.3, 10.4, 13.6], 400),
    ];
    for (const formation of ["4-3-3", "4-4-2", "3-5-2"] as const) {
      const result = pickAutoLineup(candidates, formation, 60);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.players).toHaveLength(11);
      expect(new Set(result.players.map((item) => item.id)).size).toBe(11);
      expect(result.cost).toBe(sumPrices(result.players.map((item) => item.price)));
      expect(fitsBudget(result.cost, 60)).toBe(true);
      expect(result.cost).toBeGreaterThan(40);
    }
  });

  it("informa quando falta jogador em alguma posição ou o saldo não cobre o time mais barato", () => {
    expect(pickAutoLineup([player(1, "GOL", 5, 1)], "4-3-3", 60)).toEqual({ ok: false, reason: "POSICOES_INSUFICIENTES" });
    const expensive = [...pool("GOL", [10], 1), ...pool("DEF", [10, 10, 10, 10], 10), ...pool("MEI", [10, 10, 10], 20), ...pool("ATA", [10, 10, 10], 30)];
    expect(pickAutoLineup(expensive, "4-3-3", 60)).toEqual({ ok: false, reason: "SALDO_INSUFICIENTE" });
  });
});
