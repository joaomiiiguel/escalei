import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: unknown };
const leagueResult = vi.fn<() => Result>();
const upsertResult = vi.fn<() => Result>();
const upserts: unknown[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query = { select: () => query, eq: () => query, is: () => query, maybeSingle: async () => leagueResult() };
      if (table === "ligas") return query;
      return { upsert: async (payload: unknown) => { upserts.push(payload); return upsertResult(); } };
    },
  }),
}));

import { getOpenLeague, joinOpenLeague } from "@/lib/open-league";

beforeEach(() => {
  upserts.length = 0;
  leagueResult.mockReset().mockReturnValue({ data: { id: "geral", dono_id: "admin" }, error: null });
  upsertResult.mockReset().mockReturnValue({ data: null, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("grupo geral", () => {
  it("devolve o grupo ABERTA ativo, ou null se não houver ou se a consulta falhar", async () => {
    await expect(getOpenLeague()).resolves.toEqual({ id: "geral", dono_id: "admin" });

    leagueResult.mockReturnValue({ data: null, error: null });
    await expect(getOpenLeague()).resolves.toBeNull();

    leagueResult.mockReturnValue({ data: null, error: { message: "falhou" } });
    await expect(getOpenLeague()).resolves.toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("coloca o usuário no grupo geral sem duplicar o vínculo", async () => {
    await expect(joinOpenLeague("jogador")).resolves.toBe(true);
    expect(upserts).toEqual([{ liga_id: "geral", usuario_id: "jogador", convidado_por: null }]);
  });

  it("não inscreve ninguém sem grupo geral e avisa quando o vínculo falha", async () => {
    leagueResult.mockReturnValue({ data: null, error: null });
    await expect(joinOpenLeague("jogador")).resolves.toBe(false);
    expect(upserts).toHaveLength(0);

    leagueResult.mockReturnValue({ data: { id: "geral", dono_id: "admin" }, error: null });
    upsertResult.mockReturnValue({ data: null, error: { message: "falhou" } });
    await expect(joinOpenLeague("jogador")).resolves.toBe(false);
  });
});
