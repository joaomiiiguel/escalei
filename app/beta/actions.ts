"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { toWaitlistEntry, validateWaitlist, type WaitlistErrors, type WaitlistValues } from "@/lib/waitlist";

export type WaitlistResult = { ok: true } | { ok: false; errors?: WaitlistErrors; message?: string };

/** Código do Postgres para violação de unicidade: o e-mail já está na lista. */
const UNIQUE_VIOLATION = "23505";

export async function joinWaitlist(input: WaitlistValues): Promise<WaitlistResult> {
  const values: WaitlistValues = {
    name: String(input?.name ?? ""),
    whatsapp: String(input?.whatsapp ?? ""),
    email: String(input?.email ?? ""),
    consent: input?.consent === true,
  };
  const errors = validateWaitlist(values);
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  try {
    const { error } = await createAdminClient().from("lista_espera").insert(toWaitlistEntry(values));
    if (error && error.code !== UNIQUE_VIOLATION) {
      return { ok: false, message: "Não foi possível entrar na lista agora. Tente novamente em instantes." };
    }
  } catch {
    return { ok: false, message: "Não foi possível entrar na lista agora. Tente novamente em instantes." };
  }

  return { ok: true };
}
