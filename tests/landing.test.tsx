import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import LandingPage, { metadata } from "@/app/(landing)/page";
import { MarketDemo } from "@/app/_landing/market-demo";
import { Navbar } from "@/components/ui/navbar";

let pathname = "/";
vi.mock("next/navigation", () => ({ redirect: vi.fn(), usePathname: () => pathname }));
vi.mock("lucide-react", () => {
  const icons = ["ArrowRight", "Check", "House", "Info", "Loader2", "Lock", "MessageCircle", "Plus", "Shirt", "Trophy", "UserRound", "Whistle", "X", "CircleHelp"];
  return Object.fromEntries(icons.map((icon) => [icon, () => null]));
});
vi.mock("@/app/actions", () => ({ joinWaitlist: vi.fn() }));
vi.mock("@/components/ui/how-it-works-modal", () => ({ HowItWorksModal: () => null }));
vi.mock("@/components/pwa/install-invite", () => ({ InstallInvite: () => null }));

/** Como o `redirect` real do Next, interrompe a execução. */
class RedirectError extends Error {}

async function renderVisitorPage() {
  vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
  return render(await LandingPage());
}

beforeEach(() => {
  vi.mocked(redirect).mockReset().mockImplementation((url: string) => { throw new RedirectError(url); });
});

describe("landing pública", () => {
  it("manda quem está logado para a Início do app", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: "jogador" } as never);

    await expect(LandingPage()).rejects.toThrow(new RedirectError("/inicio"));
  });

  it("abre com o formulário da lista de espera no hero", async () => {
    const { container } = await renderVisitorPage();
    const hero = container.querySelector("section#lista-de-espera")!;

    expect(container.querySelector("main > section")).toBe(hero);
    expect(hero.querySelector("h1")).toHaveTextContent("Mostre que você entende de futebol.");
    expect(within(hero as HTMLElement).getByRole("form", { name: "Entrar na lista de espera" })).toBeInTheDocument();
  });

  it("repete o formulário na seção final, com campos próprios", async () => {
    const { container } = await renderVisitorPage();
    const final = screen.getByRole("heading", { name: /Sua turma já tem opinião/ }).closest("section")!;

    expect(within(final).getByRole("form", { name: "Entrar na lista de espera" })).toBeInTheDocument();
    const ids = [...container.querySelectorAll("form input[id]")].map((input) => input.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });

  it("leva o CTA do topo ao formulário e o Entrar ao login", async () => {
    await renderVisitorPage();

    expect(screen.getByRole("link", { name: "Quero testar grátis" })).toHaveAttribute("href", "#lista-de-espera");
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar");
    expect(screen.getAllByRole("link", { name: "Como funciona" })[0]).toHaveAttribute("href", "#como-funciona");
    expect(document.getElementById("como-funciona")).not.toBeNull();
  });

  it("deixa claro que não é aposta e separa o passe (R$) do saldo (C$)", async () => {
    const { container } = await renderVisitorPage();
    const text = `${container.textContent} ${metadata.description}`;

    expect(text).toMatch(/sem apostas/i);
    expect(text).toContain("R$ 4,99");
    expect(text).toContain("R$ 19,99");
    expect(text).toContain("2 passes de presente");
    expect(screen.getByRole("heading", { name: "Passe de rodada" }).closest("article")).toHaveTextContent("R$ · dinheiro real");
    expect(screen.getByRole("heading", { name: "Saldo" }).closest("article")).toHaveTextContent("C$ · moeda do jogo");
    for (const banned of [/\bodds?\b/i, /palpite/i, /bilhete/i, /lucro/i, /investir/i, /ganhe dinheiro/i, /garantido/i, /\bbeta\b/i]) {
      expect(container.textContent).not.toMatch(banned);
    }
  });

  it("identifica conversa, ranking e mercado como exemplo", async () => {
    await renderVisitorPage();

    expect(screen.getByText("Ilustração")).toBeInTheDocument();
    expect(screen.getByText("Exemplo")).toBeInTheDocument();
    expect(screen.getByText("Demonstração")).toBeInTheDocument();
    expect(screen.getByText(/Jogadores e preços inventados/)).toBeInTheDocument();
  });

  it("abre só a primeira pergunta do FAQ, que explica como entrar", async () => {
    const { container } = await renderVisitorPage();
    const questions = container.querySelectorAll("#perguntas details");

    expect(questions).toHaveLength(7);
    expect([...questions].map((question) => question.hasAttribute("open"))).toEqual([true, false, false, false, false, false, false]);
    expect(questions[0]).toHaveTextContent("Como eu entro?");
  });
});

describe("demonstração do mercado", () => {
  it("baixa o saldo a cada jogador escalado e devolve ao limpar", () => {
    render(<MarketDemo />);
    const balance = () => screen.getByText(/^C\$ \d+,\d{2}$/, { selector: "p" });
    expect(balance()).toHaveTextContent("C$ 60,00");
    expect(screen.getByText("Toque nos jogadores pra montar seu time.")).toBeInTheDocument();

    for (const name of [/GOL do PAL/, /MEI do COR/, /ATA do FLA/]) fireEvent.click(screen.getByRole("button", { name }));

    expect(balance()).toHaveTextContent("C$ 35,40");
    expect(screen.getByText("Sobra C$ 35,40 pra completar os 11.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ATA do FLA/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("button", { name: /ATA do FLA/ })).getByText("Escalado")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar" }));

    expect(balance()).toHaveTextContent("C$ 60,00");
    expect(screen.queryByRole("button", { name: "Limpar" })).toBeNull();
  });
});

describe("navegação do app", () => {
  it("some na landing e aponta a Início para /inicio", () => {
    pathname = "/";
    const { container, unmount } = render(<Navbar />);
    expect(container.querySelector("[data-app-navbar]")).toBeNull();
    unmount();

    pathname = "/inicio";
    render(<Navbar />);
    const home = screen.getAllByRole("link").find((link) => link.getAttribute("href") === "/inicio");
    expect(home).toHaveAttribute("aria-current", "page");
  });
});

describe("logo", () => {
  it("aparece no topo e no rodapé da Home, levando para a página inicial", async () => {
    await renderVisitorPage();

    const logos = screen.getAllByRole("link", { name: "Escalou, página inicial" });
    expect(logos).toHaveLength(2);
    logos.forEach((logo) => expect(logo).toHaveAttribute("href", "/"));
  });
});

describe("links antigos da lista de espera", () => {
  it("mandam /beta para a Home sem cache permanente", async () => {
    const { default: config } = await import("@/next.config");

    await expect(config.redirects?.()).resolves.toEqual([{ source: "/beta", destination: "/", permanent: false }]);
  });
});

describe("carregamento da landing", () => {
  it("mostra só a logo e o aviso de carregando, sem o esqueleto da Início do app", async () => {
    const { default: LandingLoading } = await import("@/app/(landing)/loading");
    render(<LandingLoading />);

    expect(screen.getByRole("main", { name: "Carregando a página" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByTestId("logo-horizontal")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Carregando...");
    expect(screen.queryByLabelText("Carregando início")).toBeNull();
  });
});
