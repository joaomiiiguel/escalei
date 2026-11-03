import { describe, expect, it } from "vitest";
import { hasGameStarted, isLateLineupOpen, startedClubIds } from "@/lib/lineup-rules";

const now = new Date("2026-11-08T17:00:00-03:00");
const lockedRound = { status: "EM_ANDAMENTO" as const, trava_em: "2026-11-08T15:00:00-03:00" };

function game(home: number, status: string, inicio_em = "2026-11-08T20:00:00-03:00", inicio_simulado_em: string | null = null) {
  return { clube_casa_id: home, clube_fora_id: home + 1, status, inicio_em, inicio_simulado_em };
}

describe("escalação tardia", () => {
  it("considera iniciado o jogo em andamento, encerrado ou com o horário vencido", () => {
    expect(hasGameStarted(game(1, "EM_ANDAMENTO"), now)).toBe(true);
    expect(hasGameStarted(game(1, "ENCERRADO"), now)).toBe(true);
    expect(hasGameStarted(game(1, "A_JOGAR", "2026-11-08T16:00:00-03:00"), now)).toBe(true);
    expect(hasGameStarted(game(1, "A_JOGAR"), now)).toBe(false);
    expect(hasGameStarted(game(1, "ADIADO", "2026-11-08T16:00:00-03:00"), now)).toBe(false);
  });

  it("usa o horário simulado quando existe", () => {
    expect(hasGameStarted(game(1, "A_JOGAR", "2026-11-08T16:00:00-03:00", "2026-11-08T21:00:00-03:00"), now)).toBe(false);
  });

  it("fica aberta enquanto menos da metade dos jogos começou", () => {
    const games = [game(1, "ENCERRADO"), game(3, "EM_ANDAMENTO"), game(5, "A_JOGAR"), game(7, "A_JOGAR"), game(9, "A_JOGAR")];
    expect(isLateLineupOpen(lockedRound, games, now)).toBe(true);
    expect(isLateLineupOpen(lockedRound, games.slice(0, 4), now)).toBe(false);
  });

  it("fica fechada antes da trava, com a rodada fechada ou sem jogos", () => {
    const games = [game(1, "A_JOGAR"), game(3, "A_JOGAR")];
    expect(isLateLineupOpen({ status: "ABERTA", trava_em: "2026-11-08T18:00:00-03:00" }, games, now)).toBe(false);
    expect(isLateLineupOpen({ ...lockedRound, status: "FECHADA" }, games, now)).toBe(false);
    expect(isLateLineupOpen(lockedRound, [], now)).toBe(false);
    expect(isLateLineupOpen(null, games, now)).toBe(false);
  });

  it("abre também com a rodada ainda ABERTA depois da trava, antes do orquestrador passar", () => {
    expect(isLateLineupOpen({ ...lockedRound, status: "ABERTA" }, [game(1, "A_JOGAR")], now)).toBe(true);
  });

  it("lista os dois clubes de cada jogo que já começou", () => {
    const games = [game(1, "ENCERRADO"), game(3, "EM_ANDAMENTO"), game(5, "A_JOGAR")];
    expect([...startedClubIds(games, now)].sort()).toEqual([1, 2, 3, 4]);
  });
});
