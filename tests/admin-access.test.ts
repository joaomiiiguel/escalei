import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-access";

/** Como o `redirect` real do Next, interrompe a execução. */
class RedirectError extends Error {}

function mockSupabase({ user, admin, error = null }: { user: { id: string } | null; admin: boolean; error?: unknown }) {
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: admin ? { usuario_id: user?.id } : null, error }) };
  const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) }, from: vi.fn(() => query) };
  vi.mocked(createClient).mockResolvedValue(client as never);
  return { client, query };
}

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockReset().mockImplementation((url: string) => { throw new RedirectError(url); });
  });

  it("manda para /entrar quem não está logado", async () => {
    mockSupabase({ user: null, admin: false });
    await expect(requireAdmin()).rejects.toThrow("/entrar");
  });

  it("manda para a Início quem está logado mas não é administrador", async () => {
    const { client, query } = mockSupabase({ user: { id: "jogador" }, admin: false });
    await expect(requireAdmin()).rejects.toThrow(new RedirectError("/"));
    expect(client.from).toHaveBeenCalledWith("administradores");
    expect(query.eq).toHaveBeenCalledWith("usuario_id", "jogador");
  });

  it("nega o acesso se a consulta de administradores falhar", async () => {
    mockSupabase({ user: { id: "admin" }, admin: true, error: { message: "falhou" } });
    await expect(requireAdmin()).rejects.toThrow(new RedirectError("/"));
  });

  it("libera o administrador e devolve o usuário verificado no servidor", async () => {
    const { client } = mockSupabase({ user: { id: "admin" }, admin: true });
    await expect(requireAdmin()).resolves.toMatchObject({ user: { id: "admin" } });
    expect(client.auth.getUser).toHaveBeenCalled();
  });
});

describe("área /admin protegida por inteiro", () => {
  const ADMIN_DIR = path.resolve(__dirname, "../app/admin");
  const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
  const pagesAndLayouts = files(ADMIN_DIR).filter((file) => /\/(page|layout)\.tsx$/.test(file));

  it.each(pagesAndLayouts.map((file) => [path.relative(ADMIN_DIR, file), file]))("%s chama requireAdmin", (_name, file) => {
    expect(readFileSync(file, "utf8")).toMatch(/await requireAdmin\(\)/);
  });

  it("toda Server Action do admin (menos sair) chama requireAdmin", () => {
    const source = readFileSync(path.join(ADMIN_DIR, "actions.ts"), "utf8");
    const actions = [...source.matchAll(/export async function (\w+)\([^)]*\) \{([\s\S]*?)\n\}/g)];
    expect(actions.length).toBeGreaterThan(1);
    for (const [, name, body] of actions) {
      if (name === "signOut") continue;
      expect(body, name).toMatch(/await requireAdmin\(\)/);
    }
  });
});
