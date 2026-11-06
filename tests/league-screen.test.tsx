import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { LeagueHero } from "@/app/ligas/[id]/league-hero";
import { StandingsTable, type StandingRow } from "@/app/ligas/[id]/standings-table";

afterEach(cleanup);

function row(position: number, apelido: string, extra: Partial<StandingRow> = {}): StandingRow {
  return { usuario_id: apelido, apelido, club: "FLA", points: 100 - position * 10, position, isCurrentUser: false, detail: null, change: null, ...extra };
}

describe("tabela da liga", () => {
  it("marca o usuário, o líder e o lanterna", () => {
    render(<StandingsTable label="Classificação" rows={[row(1, "Marcão"), row(2, "Miguel", { isCurrentUser: true }), row(3, "Rafa", { club: null })]} />);
    const items = within(screen.getByRole("list", { name: "Classificação" })).getAllByRole("listitem");
    expect(items[1]).toHaveAttribute("aria-current", "true");
    expect(items[1]).toHaveTextContent("Miguelvocê");
    expect(items[2]).toHaveTextContent("lanterna");
    expect(screen.getByText("Líder")).toBeInTheDocument();
    expect(screen.getByText("Lanterna")).toBeInTheDocument();
  });

  it("mostra o detalhe do campeonato junto do clube", () => {
    render(<StandingsTable label="Classificação" rows={[row(1, "Marcão", { detail: "5 rodadas" }), row(2, "Bia", { detail: "4 rodadas" })]} />);
    expect(screen.getByText("FLA, 5 rodadas")).toBeInTheDocument();
    expect(screen.queryByText("Lanterna")).toBeNull();
  });
});

describe("topo da liga", () => {
  it("destaca a posição do usuário e a distância para o líder", () => {
    render(<LeagueHero leagueId="liga" name="Resenha" icon="🍺" meta="5 membros" view="campeonato" position={3} total={5} scope="no campeonato 2026" gap="A 12,4 pts do líder" points={56} />);
    const standing = screen.getByRole("group", { name: "Seu desempenho no campeonato" });
    expect(standing).toHaveTextContent("3º");
    expect(standing).toHaveTextContent("de 5 no campeonato 2026");
    expect(standing).toHaveTextContent("A 12,4 pts do líder, com 56,0 pts");
    expect(screen.getByRole("link", { name: "Campeonato" })).toHaveAttribute("aria-current", "page");
  });

  it("mostra um traço quando o usuário ainda não está na tabela", () => {
    render(<LeagueHero leagueId="liga" name="Resenha" icon={null} meta="1 membro" view="rodada" position={null} total={0} scope="na rodada 1" gap="Você ainda não tem pontos aqui" points={null} />);
    expect(screen.getByRole("group", { name: "Seu desempenho na rodada" })).toHaveTextContent("—de 0 na rodada 1Você ainda não tem pontos aqui");
  });
});
