// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/game-kickoff");

import { nextOpponentByClub, type MatchWithClubs } from "@/lib/next-opponent";

const game = (overrides: Partial<MatchWithClubs>): MatchWithClubs => ({
  clube_casa_id: 1,
  clube_fora_id: 2,
  inicio_em: "2026-11-22T19:00:00Z",
  inicio_simulado_em: null,
  status: "A_JOGAR",
  nome_casa: "Corinthians",
  nome_fora: "Palmeiras",
  ...overrides,
});

describe("próximo adversário do clube", () => {
  it("dá a cada clube o nome do outro", () => {
    const opponents = nextOpponentByClub([game({}), game({ clube_casa_id: 3, clube_fora_id: 4, nome_casa: "Flamengo", nome_fora: "Vasco" })]);
    expect(Object.fromEntries(opponents)).toEqual({ 1: "Palmeiras", 2: "Corinthians", 3: "Vasco", 4: "Flamengo" });
  });

  it("ignora jogos encerrados e cancelados", () => {
    const opponents = nextOpponentByClub([game({ status: "ENCERRADO" }), game({ clube_casa_id: 3, clube_fora_id: 4, status: "CANCELADO" })]);
    expect(opponents.size).toBe(0);
  });

  it("fica com o jogo que começa primeiro, considerando o horário simulado", () => {
    const opponents = nextOpponentByClub([
      game({ clube_fora_id: 5, nome_fora: "Santos", inicio_em: "2026-11-22T19:00:00Z" }),
      game({ inicio_em: "2026-11-25T19:00:00Z", inicio_simulado_em: "2026-11-20T19:00:00Z" }),
    ]);
    expect(opponents.get(1)).toBe("Palmeiras");
  });

  it("não define adversário sem o nome dos dois clubes", () => {
    expect(nextOpponentByClub([game({ nome_fora: null })]).size).toBe(0);
  });
});
