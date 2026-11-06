import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { getCurrentRound } from "@/lib/current-round";
import Home from "@/app/inicio/page";

/** Como o `redirect` real do Next, interrompe a execução. */
class RedirectError extends Error {}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("getCurrentUser", () => {
  it("devolve o usuário verificado pelo Supabase Auth, ou null", async () => {
    const getUser = vi.fn()
      .mockResolvedValueOnce({ data: { user: { id: "jogador" } }, error: null })
      .mockResolvedValueOnce({ data: { user: null }, error: null });
    vi.doMock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser } }) }));
    vi.doMock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }));
    vi.resetModules();
    const { getCurrentUser: actualGetCurrentUser } = await vi.importActual<typeof import("@/lib/supabase/server")>("@/lib/supabase/server");

    await expect(actualGetCurrentUser()).resolves.toEqual({ id: "jogador" });
    await expect(actualGetCurrentUser()).resolves.toBeNull();
    expect(getUser).toHaveBeenCalledTimes(2);

    vi.doUnmock("@supabase/ssr");
    vi.doUnmock("next/headers");
  });
});

describe("Início", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockReset().mockImplementation((url: string) => { throw new RedirectError(url); });
  });

  it("busca grupo, perfil e rodada atual em paralelo, sem esperar uma pela outra", async () => {
    const membership = deferred<"ATIVA" | "INATIVA" | "NENHUMA">();
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle };
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "jogador" } as never);
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => query) } as never);
    vi.mocked(getLeagueMembershipStatus).mockReturnValue(membership.promise);
    vi.mocked(getCurrentRound).mockClear();

    const page = Home();
    await vi.waitFor(() => expect(getCurrentRound).toHaveBeenCalledTimes(1));
    expect(maybeSingle).toHaveBeenCalledTimes(1);

    membership.resolve("NENHUMA");
    await expect(page).rejects.toThrow("/entrar?erro=sem_liga");
  });

  it("manda para o onboarding quem participa de grupo ativo mas não tem perfil", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "jogador" } as never);
    vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => query) } as never);
    vi.mocked(getLeagueMembershipStatus).mockResolvedValue("ATIVA");

    await expect(Home()).rejects.toThrow("/onboarding");
  });
});
