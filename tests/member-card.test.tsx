import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemberCard } from "@/app/perfil/member-card";

afterEach(cleanup);

describe("carteirinha do perfil", () => {
  it("mostra apelido, time do coração, data de entrada e números", () => {
    render(<MemberCard apelido="miguel" club={{ nome: "Botafogo", sigla: "BOT", logo_url: null }} memberSince="2026-10-12T15:00:00Z" stats={{ roundsPlayed: 4, averagePoints: 52.35, leagues: 1 }} action={<button type="button">Editar perfil</button>} />);
    expect(screen.getByRole("heading", { name: "miguel" })).toBeInTheDocument();
    expect(screen.getByText("Botafogo")).toBeInTheDocument();
    expect(screen.getByText(/No Escalou desde/)).toHaveTextContent("out. de 2026");
    expect(screen.getByText("rodadas jogadas").parentElement).toHaveTextContent("4");
    expect(screen.getByText("média por rodada").parentElement).toHaveTextContent("52,4");
    expect(screen.getByText("liga").parentElement).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Editar perfil" })).toBeInTheDocument();
  });

  it("explica quando não há time do coração nem média", () => {
    render(<MemberCard apelido="novato" club={null} memberSince="2026-11-01T12:00:00Z" stats={{ roundsPlayed: 1, averagePoints: null, leagues: 2 }} />);
    expect(screen.getByText("Sem time do coração definido")).toBeInTheDocument();
    expect(screen.getByText("rodada jogada")).toBeInTheDocument();
    expect(screen.getByText("média por rodada").parentElement).toHaveTextContent("—");
    expect(screen.getByText("ligas")).toBeInTheDocument();
  });
});
