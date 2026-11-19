// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.unmock("@/lib/game-kickoff");
import { matchLabel, nextMatchByClub, type MatchWithClubs } from "@/lib/next-match";

const game = (overrides: Partial<MatchWithClubs>): MatchWithClubs => ({
  clube_casa_id: 1,
  clube_fora_id: 2,
  inicio_em: "2026-11-22T19:00:00Z",
  inicio_simulado_em: null,
  status: "A_JOGAR",
  sigla_casa: "COR",
  sigla_fora: "PAL",
  ...overrides,
});

describe("próximo jogo do clube", () => {
  it("escreve o confronto com o mandante primeiro", () => {
    expect(matchLabel("COR", "PAL")).toBe("CORxPAL");
  });

  it("dá o mesmo confronto para mandante e visitante", () => {
    const matches = nextMatchByClub([game({}), game({ clube_casa_id: 3, clube_fora_id: 4, sigla_casa: "FLA", sigla_fora: "VAS" })]);
    expect(Object.fromEntries(matches)).toEqual({ 1: "CORxPAL", 2: "CORxPAL", 3: "FLAxVAS", 4: "FLAxVAS" });
  });

  it("ignora jogos encerrados e cancelados", () => {
    const matches = nextMatchByClub([game({ status: "ENCERRADO" }), game({ clube_casa_id: 3, clube_fora_id: 4, status: "CANCELADO" })]);
    expect(matches.size).toBe(0);
  });

  it("fica com o jogo que começa primeiro, considerando o horário simulado", () => {
    const matches = nextMatchByClub([
      game({ clube_fora_id: 5, sigla_fora: "SAN", inicio_em: "2026-11-22T19:00:00Z" }),
      game({ inicio_em: "2026-11-25T19:00:00Z", inicio_simulado_em: "2026-11-20T19:00:00Z" }),
    ]);
    expect(matches.get(1)).toBe("CORxPAL");
  });

  it("não monta confronto sem a sigla dos dois clubes", () => {
    expect(nextMatchByClub([game({ sigla_fora: null })]).size).toBe(0);
  });
});
