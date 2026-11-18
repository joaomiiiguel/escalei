import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const requireAdmin = vi.fn();
const revalidatePath = vi.fn();
const updates: { table: string; payload: unknown; filters: unknown[][] }[] = [];
let updateError: unknown = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      update: (payload: unknown) => {
        const call = { table, payload, filters: [] as unknown[][] };
        updates.push(call);
        return { eq: async (...args: unknown[]) => { call.filters.push(args); return { error: updateError }; } };
      },
    }),
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/admin-access", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin-access")>()),
  requireAdmin: () => requireAdmin(),
}));

import { setDemoMode } from "@/app/admin/actions";
import { isDemoModeEnabled } from "@/lib/admin-access";

function clientReturning(result: { data: unknown; error: unknown }) {
  const query = { select: () => query, eq: () => query, maybeSingle: async () => result };
  return { from: () => query } as unknown as SupabaseClient;
}

beforeEach(() => {
  updates.length = 0;
  updateError = null;
  revalidatePath.mockReset();
  requireAdmin.mockReset().mockResolvedValue({ user: { id: "admin-id" } });
});

describe("isDemoModeEnabled", () => {
  it("liga só para admin com a opção marcada", async () => {
    expect(await isDemoModeEnabled(clientReturning({ data: { modo_demonstracao: true }, error: null }), "u")).toBe(true);
    expect(await isDemoModeEnabled(clientReturning({ data: { modo_demonstracao: false }, error: null }), "u")).toBe(false);
  });

  it("fica desligado para quem não é admin", async () => {
    expect(await isDemoModeEnabled(clientReturning({ data: null, error: null }), "u")).toBe(false);
  });

  it("falha fechada quando a consulta dá erro", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await isDemoModeEnabled(clientReturning({ data: null, error: { message: "x" } }), "u")).toBe(false);
    consoleError.mockRestore();
  });
});

describe("setDemoMode", () => {
  it("grava a opção só na linha do próprio admin e revalida as telas", async () => {
    await expect(setDemoMode(true)).resolves.toEqual({ ok: true, enabled: true });
    expect(updates).toEqual([{ table: "administradores", payload: { modo_demonstracao: true }, filters: [["usuario_id", "admin-id"]] }]);
    expect(revalidatePath.mock.calls.map(([path]) => path)).toEqual(["/inicio", "/escalar", "/admin"]);
  });

  it("recusa valor que não é booleano sem tocar no banco", async () => {
    await expect(setDemoMode("true")).resolves.toEqual({ ok: false, error: "Valor inválido para o modo demonstração." });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(updates).toHaveLength(0);
  });

  it("exige admin", async () => {
    requireAdmin.mockRejectedValue(new Error("REDIRECT:/inicio"));
    await expect(setDemoMode(false)).rejects.toThrow("REDIRECT:/inicio");
    expect(updates).toHaveLength(0);
  });

  it("devolve mensagem amigável quando o banco falha", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    updateError = { message: "falhou" };
    await expect(setDemoMode(false)).resolves.toEqual({ ok: false, error: "Não foi possível salvar. Tente de novo." });
    expect(revalidatePath).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
