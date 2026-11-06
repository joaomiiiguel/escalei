import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeWaitlistSource, toWaitlistEntry, validateWaitlist } from "@/lib/waitlist";

const insert = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: () => ({ insert }) }),
}));

const valid = { name: "  Ana   Souza ", whatsapp: "(11) 98765-4321", email: " Ana@Exemplo.com ", consent: true };

describe("validação da lista de espera", () => {
  it("aceita um cadastro válido", () => {
    expect(validateWaitlist(valid)).toEqual({});
  });

  it("aponta cada campo inválido", () => {
    expect(validateWaitlist({ name: "A", whatsapp: "1234", email: "sem-arroba", consent: false })).toEqual({
      name: "Informe seu nome ou apelido.",
      whatsapp: "Informe um WhatsApp com DDD.",
      email: "Informe um e-mail válido.",
      consent: "Você precisa aceitar o contato do Escalou.",
    });
  });

  it("normaliza nome, WhatsApp e e-mail para gravação", () => {
    expect(toWaitlistEntry(valid)).toEqual({ nome: "Ana Souza", whatsapp: "11987654321", email: "ana@exemplo.com", origem: "beta" });
  });

  it("normaliza a origem e trata valor inválido como acesso direto", () => {
    expect(normalizeWaitlistSource(" Instagram ")).toBe("instagram");
    expect(normalizeWaitlistSource("ig_stories-1")).toBe("ig_stories-1");
    expect(normalizeWaitlistSource(undefined)).toBe("beta");
    expect(normalizeWaitlistSource("")).toBe("beta");
    expect(normalizeWaitlistSource("<script>")).toBe("beta");
    expect(normalizeWaitlistSource("a".repeat(41))).toBe("beta");
  });
});

describe("joinWaitlist", () => {
  beforeEach(() => insert.mockReset());

  it("grava o cadastro normalizado", async () => {
    insert.mockResolvedValue({ error: null });
    const { joinWaitlist } = await import("@/app/actions");
    await expect(joinWaitlist(valid)).resolves.toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith({ nome: "Ana Souza", whatsapp: "11987654321", email: "ana@exemplo.com", origem: "beta" });
  });

  it("grava a origem recebida já normalizada", async () => {
    insert.mockResolvedValue({ error: null });
    const { joinWaitlist } = await import("@/app/actions");
    await joinWaitlist({ ...valid, source: "Instagram" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ origem: "instagram" }));
  });

  it("valida no servidor e não grava dados inválidos", async () => {
    const { joinWaitlist } = await import("@/app/actions");
    const result = await joinWaitlist({ ...valid, consent: false });
    expect(result).toMatchObject({ ok: false, errors: { consent: expect.any(String) } });
    expect(insert).not.toHaveBeenCalled();
  });

  it("trata e-mail repetido como sucesso", async () => {
    insert.mockResolvedValue({ error: { code: "23505" } });
    const { joinWaitlist } = await import("@/app/actions");
    await expect(joinWaitlist(valid)).resolves.toEqual({ ok: true });
  });

  it("devolve mensagem amigável em falha do banco", async () => {
    insert.mockResolvedValue({ error: { code: "XX000" } });
    const { joinWaitlist } = await import("@/app/actions");
    await expect(joinWaitlist(valid)).resolves.toEqual({ ok: false, message: "Não foi possível entrar na lista agora. Tente novamente em instantes." });
  });
});
