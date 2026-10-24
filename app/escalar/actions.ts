"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isFormation, normalizePlayerIds } from "@/lib/lineup-rules";
import { createClient } from "@/lib/supabase/server";

/** Erros de regra lançados por `fn_salvar_escalacao` (SQLSTATE `ES4xx`) já trazem a mensagem para o usuário. */
const RULE_ERROR_CODE = /^ES4\d\d$/;

export async function saveLineup(input: { formation: string; playerIds: number[]; roundId: number }) {
  if (!Number.isInteger(input.roundId) || !isFormation(input.formation) || !Array.isArray(input.playerIds)) {
    return { error: "Dados da escalação inválidos." };
  }

  const playerIds = normalizePlayerIds(input.playerIds);
  if (!playerIds) return { error: "Selecione os 11 jogadores antes de salvar." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou. Entre novamente para salvar." };

  // Trava, formação, disponibilidade dos jogadores e saldo são validados no banco, de forma atômica.
  const { error } = await supabase.rpc("fn_salvar_escalacao", {
    p_rodada_id: input.roundId,
    p_formacao: input.formation,
    p_jogadores: playerIds,
  });
  if (error) {
    return { error: RULE_ERROR_CODE.test(error.code ?? "") ? error.message : "Não foi possível salvar seu time. Tente novamente." };
  }

  revalidatePath("/");
  revalidatePath("/escalar");
  redirect("/?time_salvo=1");
}
