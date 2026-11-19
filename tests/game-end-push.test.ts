// @vitest-environment node
import { describe, expect, it } from "vitest";
import { gameEndBody, gameEndPayload, gameScore, playersByUser, type FinishedGame } from "../supabase/functions/_shared/game-notices";

const game: FinishedGame = { id: 7, homeSigla: "COR", awaySigla: "PAL", homeGoals: 2, awayGoals: 1 };

describe("push de fim de jogo", () => {
  it("mostra o placar com o mandante primeiro", () => {
    expect(gameScore(game)).toBe("COR 2 x 1 PAL");
    expect(gameScore({ ...game, homeGoals: null })).toBe("COR x PAL");
  });

  it("põe o placar no título e abre o time do usuário", () => {
    expect(JSON.parse(gameEndPayload(game, []))).toEqual({
      title: "⚽ Fim de jogo! COR 2 x 1 PAL",
      body: "Você não tinha jogador nesse jogo. Veja como está seu time na rodada.",
      tag: "fim-de-jogo-7",
      url: "/escalar",
    });
  });

  it("mostra a pontuação do único escalado no jogo", () => {
    expect(gameEndBody([{ name: "Yuri Alberto", points: 8.5 }])).toBe("Seu escalado: Yuri Alberto 8,5 pts.");
  });

  it("ordena os escalados pela pontuação e soma o total do jogo", () => {
    expect(gameEndBody([
      { name: "Hugo Souza", points: -1.2 },
      { name: "Yuri Alberto", points: 8.5 },
      { name: "Raphael Veiga", points: null },
    ])).toBe("Seus escalados: Yuri Alberto 8,5 pts, Hugo Souza -1,2 pts, Raphael Veiga não entrou. Total no jogo: 7,3 pts.");
  });

  it("agrupa os escalados de cada usuário", () => {
    const byUser = playersByUser([
      { usuario_id: "a", name: "Yuri Alberto", points: 8.5 },
      { usuario_id: "b", name: "Hugo Souza", points: 2 },
      { usuario_id: "a", name: "Hugo Souza", points: 2 },
    ]);
    expect(Object.fromEntries(byUser)).toEqual({
      a: [{ name: "Yuri Alberto", points: 8.5 }, { name: "Hugo Souza", points: 2 }],
      b: [{ name: "Hugo Souza", points: 2 }],
    });
  });
});
