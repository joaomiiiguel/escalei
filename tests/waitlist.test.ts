import { beforeEach, describe, expect, it, vi } from "vitest";
import { toWaitlistEntry, validateWaitlist } from "@/lib/waitlist";

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
      consent: "Você precisa aceitar o contato sobre o beta.",
    });
  });

  it("normaliza nome, WhatsApp e e-mail para gravação", () => {
    expect(toWaitlistEntry(valid)).toEqual({ nome: "Ana Souza", whatsapp: "11987654321", email: "ana@exemplo.com" });
  });
});

describe("joinWaitlist", () => {
  beforeEach(() => insert.mockReset());

  it("grava o cadastro normalizado", async () => {
    insert.mockResolvedValue({ error: null });
    const { joinWaitlist } = await import("@/app/beta/actions");
    await expect(joinWaitlist(valid)).resolves.toEqual({ ok: true });
    expect(insert).toHaveBeenCalledWith({ nome: "Ana Souza", whatsapp: "11987654321", email: "ana@exemplo.com" });
  });

  it("valida no servidor e não grava dados inválidos", async () => {
    const { joinWaitlist } = await import("@/app/beta/actions");
    const result = await joinWaitlist({ ...valid, consent: false });
    expect(result).toMatchObject({ ok: false, errors: { consent: expect.any(String) } });
    expect(insert).not.toHaveBeenCalled();
  });

  it("trata e-mail repetido como sucesso", async () => {
    insert.mockResolvedValue({ error: { code: "23505" } });
    const { joinWaitlist } = await import("@/app/beta/actions");
    await expect(joinWaitlist(valid)).resolves.toEqual({ ok: true });
  });

  it("devolve mensagem amigável em falha do banco", async () => {
    insert.mockResolvedValue({ error: { code: "XX000" } });
    const { joinWaitlist } = await import("@/app/beta/actions");
    await expect(joinWaitlist(valid)).resolves.toEqual({ ok: false, message: "Não foi possível entrar na lista agora. Tente novamente em instantes." });
  });
});
