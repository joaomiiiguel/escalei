import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { LineupPlayer } from "@/components/ui/lineup-formation";
import { LineupSummary } from "@/components/ui/lineup-summary";
import { RoundLineup, SavedLineup } from "@/components/ui/saved-lineup";

const positions: LineupPlayer["position"][] = ["GOL", "DEF", "DEF", "DEF", "DEF", "MEI", "MEI", "MEI", "ATA", "ATA", "ATA"];

function team(extra: (index: number) => Partial<LineupPlayer> = () => ({})): LineupPlayer[] {
  return positions.map((position, index) => ({ id: index + 1, name: `Jogador ${index + 1}`, position, price: 5, club: "FLA", clubName: "Flamengo", logoUrl: null, ...extra(index) }));
}

afterEach(cleanup);

describe("resumo da escalação", () => {
  it("mostra o saldo que sobra, os escalados e a média por vaga", () => {
    render(<LineupSummary budget={23.4} selectedPlayers={7} />);
    expect(screen.getByText("C$ 23,40")).toBeInTheDocument();
    expect(screen.getByText("sobram no seu saldo")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progresso da escalação" })).toHaveAttribute("aria-valuenow", "7");
    expect(screen.getByText("C$ 5,85")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Faltam 4" })).toBeDisabled();
  });

  it("avisa quando o time passa do saldo", () => {
    render(<LineupSummary budget={-2} selectedPlayers={11} />);
    expect(screen.getByText("acima do seu saldo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Orçamento excedido" })).toBeDisabled();
  });
});

describe("time salvo", () => {
  it("mostra custo e sobra e leva aos jogos da rodada no Início", () => {
    render(<SavedLineup budget={60} formation="4-3-3" players={team()} travaEm="2026-11-08T19:00:00Z" />);
    expect(screen.getByText("Sua escalação está salva")).toBeInTheDocument();
    expect(screen.getByText(/uma hora antes do primeiro jogo da rodada/)).toBeInTheDocument();
    expect(screen.getByText("Custou").parentElement).toHaveTextContent("C$ 55,00");
    expect(screen.getByText("Sobram").parentElement).toHaveTextContent("C$ 5,00");
    expect(screen.getByRole("link", { name: "Jogos da rodada" })).toHaveAttribute("href", "/inicio#jogos-da-rodada");
    expect(screen.getByRole("link", { name: "Editar time" })).toHaveAttribute("href", "/escalar?editar=1");
  });
});

describe("time na rodada", () => {
  it("soma os pontos e resume quem já pontuou, quem está em campo e quem joga depois", () => {
    const players = team((index) => index < 6
      ? { roundStatus: "ENCERRADO", roundPoints: 2.5 }
      : index < 8 ? { roundStatus: "EM_ANDAMENTO", roundPoints: 0 } : { roundStatus: "A_JOGAR", roundLabel: "21:30" });
    render(<RoundLineup formation="4-3-3" players={players} roundNumber={12} status="EM_ANDAMENTO" />);
    const scoreboard = screen.getByRole("region", { name: "Placar da rodada" });
    expect(scoreboard).toHaveTextContent("15,0");
    expect(scoreboard).toHaveTextContent("pontos até agora");
    expect(scoreboard).toHaveTextContent("6 de 11 já pontuaram, 2 em campo, 3 a jogar");
    expect(scoreboard).toHaveTextContent("Em campo agora: Jogador 7");
  });

  it("com a rodada fechada mostra o craque e a pontuação oficial", () => {
    const players = team((index) => ({ roundStatus: "ENCERRADO", roundPoints: index === 9 ? 12.3 : 1 }));
    render(<RoundLineup formation="4-3-3" players={players} roundNumber={12} status="FECHADA" />);
    const scoreboard = screen.getByRole("region", { name: "Placar da rodada" });
    expect(scoreboard).toHaveTextContent("pontos na rodada");
    expect(scoreboard).toHaveTextContent("Craque do seu time: Jogador 10, 12,3 pts");
    expect(scoreboard).toHaveTextContent("Pontuação oficial confirmada.");
  });
});
