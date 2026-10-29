import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { countRecentSignups, formatWhatsapp, whatsappLink } from "@/lib/waitlist";

const requireAdmin = vi.fn();
const query = { select: vi.fn(), order: vi.fn() };
const from = vi.fn(() => query);

vi.mock("lucide-react", () => ({ CalendarPlus: () => null, MailOpen: () => null }));
vi.mock("@/lib/admin-access", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from }) }));

import AdminInvites from "@/app/admin/convites/page";

const signups = [
  { id: 2, nome: "Bia", whatsapp: "11987654321", email: "bia@exemplo.com", criado_em: new Date().toISOString() },
  { id: 1, nome: "Caio", whatsapp: "8533334444", email: "caio@exemplo.com", criado_em: "2026-01-10T15:30:00Z" },
];

async function renderPage() {
  render(await AdminInvites());
}

describe("helpers da lista de espera no admin", () => {
  it("formata celular e fixo com DDD", () => {
    expect(formatWhatsapp("11987654321")).toBe("(11) 98765-4321");
    expect(formatWhatsapp("8533334444")).toBe("(85) 3333-4444");
    expect(formatWhatsapp("123")).toBe("123");
  });

  it("monta o link do WhatsApp com o DDI do Brasil", () => {
    expect(whatsappLink("11987654321")).toBe("https://wa.me/5511987654321");
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
    query.select.mockReturnValue(query);
    query.order.mockResolvedValue({ data: signups, error: null });
  });
  afterEach(cleanup);

  it("exige administrador antes de ler a lista de espera", async () => {
    requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(AdminInvites()).rejects.toThrow("NEXT_REDIRECT");
    expect(from).not.toHaveBeenCalled();
  });

  it("lista os inscritos do mais recente para o mais antigo, com resumo", async () => {
    await renderPage();
    expect(from).toHaveBeenCalledWith("lista_espera");
    expect(query.order).toHaveBeenCalledWith("criado_em", { ascending: false });

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["Bia", "Caio"]);
    expect(screen.getByRole("link", { name: "(11) 98765-4321" })).toHaveAttribute("href", "https://wa.me/5511987654321");
    expect(screen.getByRole("link", { name: "caio@exemplo.com" })).toHaveAttribute("href", "mailto:caio@exemplo.com");
    expect(screen.getByText("Inscritos").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("Últimos 7 dias").nextElementSibling).toHaveTextContent("1");
  });

  it("mostra estado vazio", async () => {
    query.order.mockResolvedValue({ data: [], error: null });
    await renderPage();
    expect(screen.getByText("Ninguém se inscreveu na lista de espera ainda.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("avisa quando a leitura falha", async () => {
    query.order.mockResolvedValue({ data: null, error: { message: "falhou" } });
    await renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar a lista de espera.");
  });
});
