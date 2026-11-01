import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { countRecentSignups, formatWhatsapp, waitlistInviteMessage, whatsappLink } from "@/lib/waitlist";

const requireAdmin = vi.fn();
const results: Record<string, { data: unknown; error: unknown }> = {};
const from = vi.fn((table: string) => {
  const query = {
    select: () => query,
    order: () => query,
    is: () => query,
    then: (resolve: (value: unknown) => void) => resolve(results[table]),
  };
  return query;
});

vi.mock("lucide-react", () => ({ CalendarPlus: () => null, Check: () => null, Clock3: () => null, Loader2: () => null, MessageCircle: () => null, Trash2: () => null }));
vi.mock("@/lib/admin-access", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from }) }));
vi.mock("@/app/admin/actions", () => ({ acceptWaitlistSignup: vi.fn(), deleteWaitlistSignup: vi.fn() }));

import AdminInvites from "@/app/admin/convites/page";

const GROUP = "11111111-1111-4111-8111-111111111111";
const ARCHIVED_GROUP = "22222222-2222-4222-8222-222222222222";
const signups = [
  { id: 3, nome: "Bia", whatsapp: "11987654321", email: "bia@exemplo.com", origem: "instagram", criado_em: new Date().toISOString(), liga_id: null, aceito_em: null },
  { id: 2, nome: "Caio", whatsapp: "8533334444", email: "caio@exemplo.com", origem: "beta", criado_em: "2026-01-10T15:30:00Z", liga_id: GROUP, aceito_em: "2026-01-11T15:30:00Z" },
  { id: 1, nome: "Duda", whatsapp: "21987654321", email: "duda@exemplo.com", origem: "beta", criado_em: "2026-01-09T15:30:00Z", liga_id: ARCHIVED_GROUP, aceito_em: "2026-01-11T15:30:00Z" },
];
const groups = [
  { id: GROUP, nome: "Resenha", token_convite: "token-do-grupo", arquivada_em: null, convite_expira_em: null },
  { id: "33333333-3333-4333-8333-333333333333", nome: "Expirado", token_convite: "token-velho", arquivada_em: null, convite_expira_em: "2020-01-01T00:00:00Z" },
];

async function renderPage(params: Record<string, string> = {}) {
  render(await AdminInvites({ searchParams: Promise.resolve(params) }));
}

describe("helpers da lista de espera no admin", () => {
  it("formata celular e fixo com DDD", () => {
    expect(formatWhatsapp("11987654321")).toBe("(11) 98765-4321");
    expect(formatWhatsapp("8533334444")).toBe("(85) 3333-4444");
    expect(formatWhatsapp("123")).toBe("123");
  });

  it("monta o link do WhatsApp com o DDI do Brasil e mensagem opcional", () => {
    expect(whatsappLink("11987654321")).toBe("https://wa.me/5511987654321");
    expect(whatsappLink("11987654321", "Oi, tudo & bem?")).toBe("https://wa.me/5511987654321?text=Oi%2C%20tudo%20%26%20bem%3F");
  });

  it("escreve o convite com grupo, link e o e-mail autorizado", () => {
    const message = waitlistInviteMessage({ nome: "Bia", grupo: "Resenha", email: "bia@exemplo.com", link: "https://app/convite/abc" });
    for (const part of ["Bia", "Resenha", "bia@exemplo.com", "https://app/convite/abc"]) expect(message).toContain(part);
  });

  it("conta só as inscrições dos últimos 7 dias", () => {
    const now = new Date("2026-10-29T12:00:00Z");
    expect(countRecentSignups([
      { criado_em: "2026-10-29T10:00:00Z" },
      { criado_em: "2026-10-22T12:00:00Z" },
      { criado_em: "2026-10-20T12:00:00Z" },
    ], now)).toBe(2);
  });
});

describe("tela admin de convites", () => {
  beforeEach(() => {
    requireAdmin.mockReset().mockResolvedValue({});
    from.mockClear();
    results.lista_espera = { data: signups, error: null };
    results.ligas = { data: groups, error: null };
  });
  afterEach(cleanup);

  it("exige administrador antes de ler a lista de espera", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(AdminInvites({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(from).not.toHaveBeenCalled();
  });

  it("separa pendentes e aceitos, com resumo", async () => {
    await renderPage();
    const pending = within(screen.getByRole("region", { name: "Pendentes" }));
    const accepted = within(screen.getByRole("region", { name: "Aceitos" }));
    expect(pending.getByText("Bia")).toBeInTheDocument();
    expect(accepted.getByText("Caio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "(11) 98765-4321" })).toHaveAttribute("href", "https://wa.me/5511987654321");
    expect(screen.getByRole("link", { name: "caio@exemplo.com" })).toHaveAttribute("href", "mailto:caio@exemplo.com");
    expect(screen.getAllByText("Pendentes")[0].nextElementSibling).toHaveTextContent("2");
    expect(screen.getAllByText("Aceitos")[0].nextElementSibling).toHaveTextContent("1");
    expect(screen.getByText("Últimos 7 dias").nextElementSibling).toHaveTextContent("1");
  });

  it("mostra a origem de cada inscrição e o total por origem", async () => {
    await renderPage();
    expect(screen.getByText("Inscrições por origem: Direto 2 · instagram 1")).toBeInTheDocument();
    expect(screen.getByText(/Origem: instagram/)).toBeInTheDocument();
    expect(screen.getAllByText(/Origem: Direto/)).toHaveLength(2);
  });

  it("oferece só grupos que recebem convites e pede grupo para aceitar", async () => {
    await renderPage();
    const select = screen.getByRole("combobox", { name: "Grupo para Bia" });
    expect(select).toBeRequired();
    expect(within(select).getAllByRole("option").map((option) => option.textContent)).toEqual(["Escolha o grupo", "Resenha"]);
  });

  it("devolve para pendentes quem foi aceito em grupo inativo", async () => {
    await renderPage();
    expect(within(screen.getByRole("region", { name: "Pendentes" })).getByText("Duda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceitar Duda" })).toBeInTheDocument();
  });

  it("gera o WhatsApp com o link do grupo para quem foi aceito", async () => {
    await renderPage();
    const href = screen.getByRole("link", { name: "Enviar convite para Caio pelo WhatsApp" }).getAttribute("href")!;
    expect(href.startsWith("https://wa.me/558533334444?text=")).toBe(true);
    expect(decodeURIComponent(href)).toContain("/convite/token-do-grupo");
    expect(decodeURIComponent(href)).toContain("caio@exemplo.com");
  });

  it("só exclui depois de confirmar, e permite cancelar", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Excluir Bia" }));
    expect(screen.getByRole("button", { name: "Confirmar exclusão de Bia" })).toHaveAttribute("type", "submit");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Excluir Bia" })).toBeInTheDocument();
  });

  it("bloqueia o aceite quando não há grupo ativo", async () => {
    results.ligas = { data: [], error: null };
    await renderPage();
    expect(screen.getByRole("button", { name: "Aceitar Bia" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Criar grupo" })).toHaveAttribute("href", "/admin/grupos/novo");
  });

  it("mostra o estado vazio", async () => {
    results.lista_espera = { data: [], error: null };
    await renderPage();
    expect(screen.getByText("Nenhuma inscrição aguardando convite.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("avisa quando a leitura falha e mostra o retorno das ações", async () => {
    results.lista_espera = { data: null, error: { message: "falhou" } };
    await renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a lista de espera.");
    cleanup();

    results.lista_espera = { data: signups, error: null };
    await renderPage({ aceito: "1" });
    expect(screen.getByRole("status")).toHaveTextContent("Inscrição aceita.");
    cleanup();

    await renderPage({ erro: "excluir" });
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível excluir a inscrição.");
  });
});
