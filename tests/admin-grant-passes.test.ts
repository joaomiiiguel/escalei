import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const revalidatePath = vi.fn();
const rpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: (...args: unknown[]) => rpc(...args) }) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/admin-access", () => ({ requireAdmin: () => requireAdmin() }));

import { grantPasses } from "@/app/admin/actions";

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  rpc.mockReset();
  revalidatePath.mockReset();
  requireAdmin.mockReset().mockResolvedValue({ user: { id: "admin-id" } });
});

describe("grantPasses", () => {
  it("concede pelo banco em nome do admin e revalida o painel", async () => {
    rpc.mockResolvedValue({ data: 3, error: null });
    await expect(grantPasses(USER, 1)).resolves.toEqual({ ok: true, available: 3 });
    expect(rpc).toHaveBeenCalledWith("fn_admin_conceder_passes", { p_admin_id: "admin-id", p_usuario_id: USER, p_quantidade: 1 });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/participantes");
  });

  it("valida a entrada antes de checar o admin ou tocar no banco", async () => {
    await expect(grantPasses("nao-e-uuid", 1)).resolves.toEqual({ ok: false, error: "Participante inválido." });
    await expect(grantPasses(USER, 0)).resolves.toEqual({ ok: false, error: "Informe de 1 a 10 passes." });
    await expect(grantPasses(USER, 1.5)).resolves.toEqual({ ok: false, error: "Informe de 1 a 10 passes." });
    expect(requireAdmin).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("exige admin", async () => {
    requireAdmin.mockRejectedValue(new Error("REDIRECT:/inicio"));
    await expect(grantPasses(USER, 1)).rejects.toThrow("REDIRECT:/inicio");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("traduz o erro do banco em mensagem amigável", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValueOnce({ data: null, error: { code: "ES404", message: "x" } });
    await expect(grantPasses(USER, 1)).resolves.toEqual({ ok: false, error: "Participante não encontrado." });
    rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "x" } });
    await expect(grantPasses(USER, 1)).resolves.toEqual({ ok: false, error: "Não foi possível conceder o passe. Tente de novo." });
    expect(revalidatePath).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
