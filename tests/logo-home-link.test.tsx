import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminMobileMenu } from "@/app/admin/admin-mobile-menu";
import { ComoFuncionaFlow } from "@/app/como-funciona/como-funciona-flow";
import { GoogleSignIn } from "@/app/entrar/email-sign-in";

vi.mock("lucide-react", () => ({ ArrowRight: () => null, Loader2: () => null, LogOut: () => null, Menu: () => null, X: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin", useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/app/admin/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/app/como-funciona/slide-illustration", () => ({ SlideIllustration: () => null }));

describe("logo leva para a home", () => {
  afterEach(cleanup);

  it("no Como funciona, volta para o Início do app", () => {
    render(<ComoFuncionaFlow />);
    expect(screen.getByRole("link", { name: "Escalou, início" })).toHaveAttribute("href", "/inicio");
  });

  it("no menu do admin, volta para o Início do app", () => {
    render(<AdminMobileMenu apelido="Miguel" />);
    expect(screen.getByRole("link", { name: "Escalou, início" })).toHaveAttribute("href", "/inicio");
  });

  it("no login, volta para a página inicial", () => {
    render(<GoogleSignIn inviteToken="" signInWithGoogle={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Escalou, página inicial" })).toHaveAttribute("href", "/");
  });
});
