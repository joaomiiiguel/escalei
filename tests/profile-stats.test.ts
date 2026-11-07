import { describe, expect, it } from "vitest";
import { profileStats } from "@/lib/profile-stats";

const team = (status: "ABERTA" | "EM_ANDAMENTO" | "FECHADA", pontos: number | string | null) => ({ pontos, rodadas: { status } });

describe("números do perfil", () => {
  it("conta as rodadas travadas e faz a média só das fechadas", () => {
    const stats = profileStats([team("FECHADA", 50), team("FECHADA", "61.5"), team("EM_ANDAMENTO", 12), team("ABERTA", 0)], []);
    expect(stats.roundsPlayed).toBe(3);
    expect(stats.averagePoints).toBe(55.75);
  });

  it("não tem média antes da primeira rodada fechar", () => {
    expect(profileStats([team("ABERTA", 0), team("EM_ANDAMENTO", 8)], []).averagePoints).toBeNull();
    expect(profileStats([], []).roundsPlayed).toBe(0);
  });

  it("aceita a rodada vinda como lista e ignora pontos nulos", () => {
    expect(profileStats([{ pontos: null, rodadas: [{ status: "FECHADA" }] }], []).averagePoints).toBe(0);
  });

  it("conta só as ligas que não foram arquivadas", () => {
    const stats = profileStats([], [{ ligas: { arquivada_em: null } }, { ligas: [{ arquivada_em: "2026-10-27T00:00:00Z" }] }, { ligas: null }]);
    expect(stats.leagues).toBe(1);
  });
});
