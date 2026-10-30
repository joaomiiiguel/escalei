import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BetaLandingPage, { metadata } from "@/app/beta/page";
import { MarketDemo } from "@/app/beta/market-demo";
import { TacticalBoard } from "@/app/beta/tactical-board";
import { WaitlistForm } from "@/app/beta/waitlist-form";

const joinWaitlist = vi.fn();
vi.mock("@/app/beta/actions", () => ({ joinWaitlist: (...args: unknown[]) => joinWaitlist(...args) }));
vi.mock("next/font/google", () => {
  const font = () => ({ className: "", variable: "" });
  return { Sofia_Sans: font, Sofia_Sans_Extra_Condensed: font };
});
vi.mock("lucide-react", () => {
  const icons = ["Check", "Loader2", "Plus"];
  return Object.fromEntries(icons.map((icon) => [icon, () => null]));
});

describe("landing do beta", () => {
  it("informa que o beta é gratuito e que os passes vêm depois", () => {
    const { container } = render(<BetaLandingPage />);
    const text = `${container.textContent} ${metadata.description}`;

    expect(text).toContain("Beta fechado e gratuito.");
    expect(text).toContain("Quando o beta acabar, escalar passa a exigir um passe de rodada");
    expect(text).toContain("R$ 4,99");
    expect(text).toContain("R$ 19,99");
    expect(text).toMatch(/sem apostas/i);
  });

  it("descreve as fotos que carregam conteúdo", () => {
    render(<BetaLandingPage />);

    expect(screen.getByAltText(/Três amigos abraçados/)).toBeInTheDocument();
  });

  it("mantém o destino dos CTAs quando o formulário vira a confirmação", () => {
    const { container } = render(<BetaLandingPage />);
    const links = container.querySelectorAll('a[href="#lista-de-espera"]');

    expect(links.length).toBeGreaterThan(0);
    expect(container.querySelector("section#lista-de-espera form")).not.toBeNull();
  });

  it("identifica o mercado como exemplo", () => {
    render(<BetaLandingPage />);

    expect(screen.getByText("Mercado de exemplo, com jogadores fictícios.")).toBeInTheDocument();
  });
});

describe("prancheta tática", () => {
  it("revela a jogada mesmo sem IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<TacticalBoard />);

    expect(screen.getByRole("img", { name: /Prancheta tática/ })).toHaveAttribute("data-visible", "true");
    vi.unstubAllGlobals();
  });

  it("só desenha a jogada quando entra na tela", () => {
    let reveal: IntersectionObserverCallback = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          reveal = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    render(<TacticalBoard />);
    const board = screen.getByRole("img", { name: /Prancheta tática/ });
    expect(board).toHaveAttribute("data-visible", "false");

    act(() => reveal([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));

    expect(board).toHaveAttribute("data-visible", "true");
    vi.unstubAllGlobals();
  });
});

describe("mercado de exemplo", () => {
  it("desconta o preço do saldo ao contratar e devolve ao dispensar", () => {
    render(<MarketDemo />);
    expect(screen.getByText("C$ 60,00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Contratar O artilheiro do momento" }));
    expect(screen.getByText("C$ 47,60")).toBeInTheDocument();
    expect(screen.getByText("1 de 11 escalados.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dispensar O artilheiro do momento" }));
    expect(screen.getByText("C$ 60,00")).toBeInTheDocument();
  });

  it("mostra o valor da última movimentação", () => {
    render(<MarketDemo />);

    fireEvent.click(screen.getByRole("button", { name: "Contratar O artilheiro do momento" }));
    expect(screen.getByText("−C$ 12,40")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Dispensar O artilheiro do momento" }));
    expect(screen.getByText("+C$ 12,40")).toBeInTheDocument();
  });

  it("contrata todo o mercado sem estourar o saldo inicial", () => {
    render(<MarketDemo />);

    screen.getAllByRole("button", { name: /^Contratar/ }).forEach((button) => fireEvent.click(button));

    expect(screen.getByText("6 de 11 escalados. Sobram C$ 13,50 para as 5 vagas que faltam.")).toBeInTheDocument();
  });
});

describe("formulário da lista de espera", () => {
  beforeEach(() => joinWaitlist.mockReset());

  function fill() {
    fireEvent.change(screen.getByLabelText("Nome ou apelido"), { target: { value: "Ana Souza" } });
    fireEvent.change(screen.getByLabelText("WhatsApp com DDD"), { target: { value: "(11) 98765-4321" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@exemplo.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
  }

  it("liga cada erro ao seu campo e não envia dados inválidos", () => {
    render(<WaitlistForm />);

    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista de espera" }));

    const name = screen.getByLabelText("Nome ou apelido");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(name.getAttribute("aria-describedby") ?? "")).toHaveTextContent("Informe seu nome ou apelido.");
    expect(screen.getByRole("checkbox")).toHaveAttribute("aria-invalid", "true");
    expect(joinWaitlist).not.toHaveBeenCalled();
  });

  it("mostra a confirmação depois de entrar na lista", async () => {
    joinWaitlist.mockResolvedValue({ ok: true });
    render(<WaitlistForm />);

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista de espera" }));

    expect(await screen.findByRole("heading", { name: "Você está na lista!" })).toBeInTheDocument();
  });

  it("explica a falha do servidor e mantém o formulário", async () => {
    joinWaitlist.mockResolvedValue({ ok: false, message: "Não foi possível entrar na lista agora." });
    render(<WaitlistForm />);

    fill();
    fireEvent.click(screen.getByRole("button", { name: "Entrar na lista de espera" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível entrar na lista agora."));
    expect(screen.getByLabelText("Nome ou apelido")).toHaveValue("Ana Souza");
  });
});
