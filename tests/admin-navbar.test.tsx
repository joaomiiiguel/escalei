import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/ui/navbar";

vi.mock("@/components/pwa/install-invite", () => ({ InstallInvite: () => null }));

afterEach(cleanup);

describe("botão do topo na navegação do app", () => {
  it("mostra Como funciona para o jogador", () => {
    render(<Navbar />);
    expect(screen.getByRole("button", { name: "Como funciona" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard do administrador" })).toBeNull();
  });

  it("troca Como funciona pelo Dashboard para o administrador", () => {
    render(<Navbar isAdmin />);
    expect(screen.getByRole("link", { name: "Dashboard do administrador" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("button", { name: "Como funciona" })).toBeNull();
  });
});
