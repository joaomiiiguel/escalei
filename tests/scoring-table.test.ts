import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatScoringPoints, SCORING_TABLE } from "@/lib/scoring-table";

/** Pesos da versão 1 de `tabela_pontuacao` lidos da migration: scout → posição → pontos. */
function migrationWeights() {
  const sql = readFileSync(path.resolve(__dirname, "../supabase/migrations/20261012212909_implement_match_scoring.sql"), "utf8");
  const weights = new Map<string, Map<string, number>>();
  for (const [, scout, posicao, pontos] of sql.matchAll(/\(1, '(\w+)', '(GOL|DEF|MEI|ATA)', (-?[\d.]+)\)/g)) {
    weights.set(scout, (weights.get(scout) ?? new Map()).set(posicao, Number(pontos)));
  }
  return weights;
}

describe("tabela de pontuação do Como funciona", () => {
  const weights = migrationWeights();

  it("mostra todos os scouts do banco, sem sobrar nem faltar", () => {
    expect(weights.size).toBe(18);
    expect(SCORING_TABLE.map((row) => row.scout).sort()).toEqual([...weights.keys()].sort());
  });

  it("cada valor exibido é o peso do banco para as posições em que o scout vale", () => {
    for (const row of SCORING_TABLE) {
      const nonZero = new Set([...weights.get(row.scout)!.values()].filter((value) => value !== 0));
      expect([...nonZero], row.scout).toEqual([row.pontos]);
    }
  });

  it("formata com sinal e vírgula decimal", () => {
    expect(formatScoringPoints(8)).toBe("+8,0");
    expect(formatScoringPoints(-0.3)).toBe("−0,3");
    expect(formatScoringPoints(1.2)).toBe("+1,2");
  });
});
