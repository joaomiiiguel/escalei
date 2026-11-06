import { describe, expect, it, vi } from "vitest";
import { countdownParts, formatPoints, groupGamesByDay, roundFigure, roundMessage, roundProgress } from "@/lib/round-home";
import type { Jogo, Rodada } from "@/lib/types";

// O setup global simplifica o horário exibido; aqui vale a regra real do horário simulado.
vi.unmock("@/lib/game-kickoff");

const now = new Date("2026-11-07T12:00:00-03:00");
const round = (status: Rodada["status"], trava_em = "2026-11-08T16:00:00-03:00"): Rodada => ({ id: 1, numero: 32, temporada: 2026, status, abre_em: "2026-11-09T10:00:00-03:00", trava_em, fechada_em: null, rotulo_api: "" });

function game(id: number, status: Jogo["status"], inicio_em: string, inicio_simulado_em: string | null = null): Jogo {
  return { id, clube_casa_id: id * 2, clube_fora_id: id * 2 + 1, inicio_em, inicio_simulado_em, status, gols_casa: null, gols_fora: null, pontuado_em: null };
}

describe("número em destaque do Início", () => {
  it("conta o tempo até a trava com a rodada aberta", () => {
    expect(roundFigure({ round: round("ABERTA"), hasTeam: false, now })).toEqual({ kind: "countdown", until: "2026-11-08T16:00:00-03:00", caption: "A escalação trava" });
  });

  it("conta o tempo até o mercado abrir com a rodada agendada", () => {
    expect(roundFigure({ round: round("AGENDADA"), hasTeam: false, now })?.kind).toBe("countdown");
    expect(roundFigure({ round: { ...round("AGENDADA"), abre_em: null }, hasTeam: false, now })).toBeNull();
  });

  it("mostra os pontos de quem escalou e os jogos de quem não escalou", () => {
    expect(roundFigure({ round: round("EM_ANDAMENTO"), hasTeam: true, now })).toEqual({ kind: "points", caption: "pontos até agora" });
    expect(roundFigure({ round: round("FECHADA"), hasTeam: true, now })).toEqual({ kind: "points", caption: "pontos na rodada" });
    expect(roundFigure({ round: round("EM_ANDAMENTO"), hasTeam: false, now })?.kind).toBe("games");
  });

  it("deixa de contar quando a trava passou, mesmo com a rodada ainda ABERTA", () => {
    expect(roundFigure({ round: round("ABERTA", "2026-11-07T11:00:00-03:00"), hasTeam: true, now })?.kind).toBe("points");
  });
});

describe("mensagem do Início", () => {
  it("prioriza a escalação tardia", () => {
    expect(roundMessage({ round: round("EM_ANDAMENTO"), hasTeam: false, lateLineup: true, now })).toMatchObject({ title: "Ainda dá tempo de escalar", cta: "Escalar agora" });
  });

  it("cobre quem ainda não escalou e quem já escalou antes da trava", () => {
    expect(roundMessage({ round: round("ABERTA"), hasTeam: false, lateLineup: false, now })).toMatchObject({ title: "Você ainda não escalou", cta: null });
    expect(roundMessage({ round: round("ABERTA"), hasTeam: true, lateLineup: false, now })).toMatchObject({ title: "Seu time está escalado", cta: "Ver escalação" });
  });

  it("cobre a rodada em andamento, fechada e travada", () => {
    expect(roundMessage({ round: round("EM_ANDAMENTO"), hasTeam: true, lateLineup: false, now }).title).toBe("Seu time está em campo");
    expect(roundMessage({ round: round("FECHADA"), hasTeam: true, lateLineup: false, now }).cta).toBe("Ver meu time");
    expect(roundMessage({ round: round("ABERTA", "2026-11-07T11:00:00-03:00"), hasTeam: true, lateLineup: false, now }).title).toBe("Seu time está travado");
    expect(roundMessage({ round: round("FECHADA"), hasTeam: false, lateLineup: false, now }).cta).toBeNull();
  });
});

describe("andamento da rodada", () => {
  const games = [
    game(3, "A_JOGAR", "2026-11-08T20:00:00-03:00"),
    game(1, "ENCERRADO", "2026-11-08T16:00:00-03:00"),
    game(2, "EM_ANDAMENTO", "2026-11-08T18:30:00-03:00"),
  ];

  it("soma os pontos e conta só os jogadores de jogos encerrados", () => {
    const progress = roundProgress({
      games,
      stats: [{ jogador_id: 1, jogo_id: 1, pontos: 8.5 }, { jogador_id: 2, jogo_id: 1, pontos: 3.25 }, { jogador_id: 3, jogo_id: 2, pontos: 1.1 }, { jogador_id: 4, jogo_id: 2, pontos: null }],
      selectedPlayers: 11,
    });
    expect(progress).toMatchObject({ points: 12.85, scoredPlayers: 2, selectedPlayers: 11, totalGames: 3, completedGames: 1, liveGames: 1 });
    expect(progress.nextGame?.id).toBe(2);
    expect(progress.lastCompletedGame?.id).toBe(1);
  });

  it("aponta o próximo jogo quando nenhum está em andamento", () => {
    const progress = roundProgress({ games: games.filter((item) => item.status !== "EM_ANDAMENTO"), stats: [], selectedPlayers: 0 });
    expect(progress.nextGame?.id).toBe(3);
    expect(progress.selectedPlayers).toBe(11);
  });
});

describe("grade de jogos", () => {
  it("agrupa por dia no horário de Brasília, em ordem de início", () => {
    const days = groupGamesByDay([
      game(2, "A_JOGAR", "2026-11-09T01:30:00Z"), // 22:30 de domingo em Brasília
      game(1, "A_JOGAR", "2026-11-08T19:00:00Z"),
      game(3, "A_JOGAR", "2026-11-09T15:00:00Z"),
    ]);
    expect(days.map((day) => day.label)).toEqual(["Domingo, 8 de novembro", "Segunda-feira, 9 de novembro"]);
    expect(days[0].games.map((item) => item.id)).toEqual([1, 2]);
  });

  it("usa o horário simulado quando existe", () => {
    const days = groupGamesByDay([game(1, "A_JOGAR", "2026-11-08T19:00:00Z", "2026-11-10T19:00:00Z")]);
    expect(days[0].label).toBe("Terça-feira, 10 de novembro");
  });
});

describe("contagem regressiva", () => {
  it("mostra dias, horas e minutos quando falta mais de um dia", () => {
    expect(countdownParts("2026-11-08T15:04:00-03:00", now)).toEqual([{ value: "1", unit: "d" }, { value: "03", unit: "h" }, { value: "04", unit: "min" }]);
  });

  it("mostra os segundos no último dia e para em zero", () => {
    expect(countdownParts("2026-11-07T14:05:09-03:00", now)).toEqual([{ value: "02", unit: "h" }, { value: "05", unit: "min" }, { value: "09", unit: "s" }]);
    expect(countdownParts("2026-11-07T11:00:00-03:00", now).map((part) => part.value)).toEqual(["00", "00", "00"]);
  });

  it("formata pontos com uma casa decimal", () => {
    expect(formatPoints(12.85)).toBe("12,9");
    expect(formatPoints(0)).toBe("0,0");
  });
});
