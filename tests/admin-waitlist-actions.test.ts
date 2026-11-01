import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
const calls: { table: string; op: string; payload?: unknown; filters: unknown[][] }[] = [];
const reads: Record<string, unknown> = {};
const writeErrors: Record<string, unknown> = {};

function table(name: string) {
  const call = { table: name, op: "select", payload: undefined as unknown, filters: [] as unknown[][] };
  const query = {
    select: () => query,
    eq: (...args: unknown[]) => { call.filters.push(["eq", ...args]); return query; },
    is: (...args: unknown[]) => { call.filters.push(["is", ...args]); return query; },
    upsert: (payload: unknown) => { Object.assign(call, { op: "upsert", payload }); calls.push(call); return query; },
    update: (payload: unknown) => { Object.assign(call, { op: "update", payload }); calls.push(call); return query; },
    delete: () => { call.op = "delete"; calls.push(call); return query; },
    maybeSingle: async () => ({ data: reads[name] ?? null, error: null }),
    then: (resolve: (value: unknown) => void) => resolve({ error: writeErrors[`${call.op}:${name}`] ?? null }),
  };
  return query;
}

vi.mock("@/lib/admin-access", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: table }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));

import { acceptWaitlistSignup, deleteWaitlistSignup } from "@/app/admin/actions";

const GROUP = "11111111-1111-4111-8111-111111111111";
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const openGroup = { id: GROUP, arquivada_em: null, convite_expira_em: null };

beforeEach(() => {
  calls.length = 0;
  for (const key of Object.keys(reads)) delete reads[key];
  for (const key of Object.keys(writeErrors)) delete writeErrors[key];
  requireAdmin.mockReset().mockResolvedValue({ user: { id: "admin-id" } });
});

describe("aceitar inscrito da lista de espera", () => {
  it("autoriza o e-mail no grupo e registra o aceite", async () => {
    reads.lista_espera = { email: "Bia@Exemplo.com" };
    reads.ligas = openGroup;
    await expect(acceptWaitlistSignup(form({ inscrito_id: "7", grupo_id: GROUP }))).rejects.toThrow("REDIRECT:/admin/convites?aceito=1");
    expect(calls.map((call) => `${call.op}:${call.table}`)).toEqual(["upsert:ligas_convites_email", "update:lista_espera"]);
    expect(calls[0].payload).toEqual({ liga_id: GROUP, email: "bia@exemplo.com", convidado_por: "admin-id" });
    expect(calls[1].payload).toMatchObject({ liga_id: GROUP, aceito_por: "admin-id" });
    expect(calls[1].filters).toEqual([["eq", "id", 7]]);
  });

  it.each([
    ["id inválido", { inscrito_id: "abc", grupo_id: GROUP }],
    ["id negativo", { inscrito_id: "-1", grupo_id: GROUP }],
    ["sem grupo", { inscrito_id: "7", grupo_id: "" }],
  ])("recusa %s sem tocar no banco", async (_label, values) => {
    await expect(acceptWaitlistSignup(form(values))).rejects.toThrow("REDIRECT:/admin/convites?erro=aceitar");
    expect(calls).toEqual([]);
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it.each([
    ["inscrito inexistente", null, openGroup],
    ["grupo inexistente", { email: "bia@exemplo.com" }, null],
    ["grupo arquivado", { email: "bia@exemplo.com" }, { ...openGroup, arquivada_em: "2026-01-01T00:00:00Z" }],
    ["convite expirado", { email: "bia@exemplo.com" }, { ...openGroup, convite_expira_em: "2020-01-01T00:00:00Z" }],
  ])("não aceita com %s", async (_label, signup, group) => {
    reads.lista_espera = signup;
    reads.ligas = group;
    await expect(acceptWaitlistSignup(form({ inscrito_id: "7", grupo_id: GROUP }))).rejects.toThrow("REDIRECT:/admin/convites?erro=aceitar");
    expect(calls).toEqual([]);
  });

  it("não registra o aceite se a autorização falhar", async () => {
    reads.lista_espera = { email: "bia@exemplo.com" };
    reads.ligas = openGroup;
    writeErrors["upsert:ligas_convites_email"] = { message: "falhou" };
    await expect(acceptWaitlistSignup(form({ inscrito_id: "7", grupo_id: GROUP }))).rejects.toThrow("REDIRECT:/admin/convites?erro=aceitar");
    expect(calls.map((call) => call.op)).toEqual(["upsert"]);
  });

  it("exige administrador", async () => {
    requireAdmin.mockRejectedValue(new Error("REDIRECT:/"));
    await expect(acceptWaitlistSignup(form({ inscrito_id: "7", grupo_id: GROUP }))).rejects.toThrow("REDIRECT:/");
    expect(calls).toEqual([]);
  });
});

describe("excluir inscrito da lista de espera", () => {
  it("revoga só a autorização não usada e remove o inscrito", async () => {
    reads.lista_espera = { email: "bia@exemplo.com", liga_id: GROUP };
    await expect(deleteWaitlistSignup(form({ inscrito_id: "7" }))).rejects.toThrow("REDIRECT:/admin/convites?excluido=1");
    expect(calls.map((call) => `${call.op}:${call.table}`)).toEqual(["delete:ligas_convites_email", "delete:lista_espera"]);
    expect(calls[0].filters).toEqual([["eq", "liga_id", GROUP], ["eq", "email", "bia@exemplo.com"], ["is", "aceito_em", null]]);
  });

  it("remove direto quem ainda não foi aceito", async () => {
    reads.lista_espera = { email: "bia@exemplo.com", liga_id: null };
    await expect(deleteWaitlistSignup(form({ inscrito_id: "7" }))).rejects.toThrow("REDIRECT:/admin/convites?excluido=1");
    expect(calls.map((call) => call.table)).toEqual(["lista_espera"]);
  });

  it("mantém o inscrito se a revogação falhar", async () => {
    reads.lista_espera = { email: "bia@exemplo.com", liga_id: GROUP };
    writeErrors["delete:ligas_convites_email"] = { message: "falhou" };
    await expect(deleteWaitlistSignup(form({ inscrito_id: "7" }))).rejects.toThrow("REDIRECT:/admin/convites?erro=excluir");
    expect(calls.map((call) => call.table)).toEqual(["ligas_convites_email"]);
  });

  it("recusa id inválido e exige administrador", async () => {
    await expect(deleteWaitlistSignup(form({ inscrito_id: "0" }))).rejects.toThrow("REDIRECT:/admin/convites?erro=excluir");
    requireAdmin.mockRejectedValue(new Error("REDIRECT:/"));
    await expect(deleteWaitlistSignup(form({ inscrito_id: "7" }))).rejects.toThrow("REDIRECT:/");
    expect(calls).toEqual([]);
  });
});
