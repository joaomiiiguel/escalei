import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminMobileMenu } from "@/app/admin/admin-mobile-menu";

vi.mock("lucide-react", () => ({ LogOut: () => null, Menu: () => null, X: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/grupos" }));
vi.mock("@/app/admin/actions", () => ({ signOut: vi.fn() }));

describe("menu do admin no mobile", () => {
  afterEach(cleanup);

  it("começa fechado e só aparece abaixo do breakpoint lg", () => {
    const { container } = render(<AdminMobileMenu apelido="Miguel" />);
    const button = screen.getByRole("button", { name: "Abrir menu" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector("header")?.className).toContain("lg:hidden");
    expect(screen.queryByRole("link", { name: "Grupos" })).toBeNull();
  });

  it("abre com os links, o usuário e o botão de sair", () => {
    render(<AdminMobileMenu apelido="Miguel" />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByRole("button", { name: "Fechar menu" }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("link", { name: "Grupos" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Participantes" }).getAttribute("href")).toBe("/admin/participantes");
    expect(screen.getByText("Miguel")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });

  it("fecha ao escolher um link e com a tecla Esc", () => {
    render(<AdminMobileMenu apelido={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    fireEvent.click(screen.getByRole("link", { name: "Participantes" }));
    expect(screen.queryByRole("link", { name: "Participantes" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(screen.getByText("Administrador")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Grupos" })).toBeNull();
  });
});
