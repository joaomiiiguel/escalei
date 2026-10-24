import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { bestPlayer, groupPosition, recapPoints, recapShareText, type RoundRecap } from "@/lib/round-recap";
import { ShareRecapButton } from "@/components/page/home/share-recap-button";

vi.mock("lucide-react", () => ({ Share2: () => null }));

const recap: RoundRecap = {
  roundNumber: 7,
  points: 54.3,
  overallPosition: 12,
  overallTotal: 80,
  groupName: "Amigos do Bairro",
  groupPosition: 2,
  groupSize: 6,
  bestPlayer: { name: "Arrascaeta", points: 12 },
};

describe("resumo de fim de rodada", () => {
  it("soma os pontos dos escalados com duas casas", () => {
    expect(recapPoints([{ jogador_id: 1, pontos: "10.10" }, { jogador_id: 2, pontos: 3.2 }, { jogador_id: 3, pontos: null }])).toBe(13.3);
  });

  it("escolhe o craque do time", () => {
    const names = new Map([[1, "Goleiro"], [2, "Atacante"]]);
    expect(bestPlayer([{ jogador_id: 1, pontos: 8.9 }, { jogador_id: 2, pontos: "10.7" }], names)).toEqual({ name: "Atacante", points: 10.7 });
    expect(bestPlayer([], names)).toBeNull();
  });

  it("calcula a posição dentro do grupo a partir das posições gerais", () => {
    const rows = [
      { usuario_id: "x", posicao: 1 },
      { usuario_id: "a", posicao: 3 },
      { usuario_id: "b", posicao: 3 },
      { usuario_id: "c", posicao: 9 },
    ];
    expect(groupPosition(rows, ["a", "b", "c"], "c")).toBe(3);
    expect(groupPosition(rows, ["a", "b", "c"], "b")).toBe(1);
    expect(groupPosition(rows, ["a", "b"], "z")).toBeNull();
  });

  it("monta o texto compartilhável sem linguagem de aposta", () => {
    const text = recapShareText(recap);
    expect(text).toBe("Fechei a Rodada 07 do Escalou com 54,3 pts — 2º de 6 no grupo Amigos do Bairro. Craque do meu time: Arrascaeta (12,0 pts). Monte seu time e venha disputar com a gente!");
    expect(text).not.toMatch(/aposta|prêmio|R\$|odd/i);
  });

  it("omite grupo e craque quando não existem", () => {
    expect(recapShareText({ ...recap, groupName: null, groupPosition: null, bestPlayer: null })).toBe("Fechei a Rodada 07 do Escalou com 54,3 pts. Monte seu time e venha disputar com a gente!");
  });
});

describe("ShareRecapButton", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("usa o compartilhamento nativo quando disponível", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share });
    render(<ShareRecapButton text="Resumo" url="https://escalou.app" />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar resumo" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: "Escalou", text: "Resumo", url: "https://escalou.app" }));
  });

  it("copia o resumo quando não há compartilhamento nativo", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<ShareRecapButton text="Resumo" url={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar resumo" }));
    await waitFor(() => expect(screen.getByText("Resumo copiado. É só colar no grupo.").textContent).toBe("Resumo copiado. É só colar no grupo."));
    expect(writeText).toHaveBeenCalledWith("Resumo");
  });
});
