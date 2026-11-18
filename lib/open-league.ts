import { createAdminClient } from "@/lib/supabase/admin";

export type OpenLeague = { id: string; dono_id: string };

/**
 * Grupo geral: o grupo ativo do tipo `ABERTA`, que recebe quem se cadastra sem convite.
 * O banco garante no máximo um ativo (`ligas_unica_aberta_idx`). Sem ele, o cadastro
 * continua exigindo convite.
 */
export async function getOpenLeague(): Promise<OpenLeague | null> {
  const { data, error } = await createAdminClient()
    .from("ligas")
    .select("id, dono_id")
    .eq("tipo", "ABERTA")
    .is("arquivada_em", null)
    .maybeSingle();

  if (error) {
    console.error("Falha ao buscar o grupo geral", error);
    return null;
  }
  return data;
}

/** Coloca no grupo geral quem já tem perfil. Devolve `false` se não houver grupo geral ou se falhar. */
export async function joinOpenLeague(userId: string): Promise<boolean> {
  const league = await getOpenLeague();
  if (!league) return false;

  const { error } = await createAdminClient().from("ligas_membros").upsert({
    liga_id: league.id,
    usuario_id: userId,
    convidado_por: null,
  }, { onConflict: "liga_id,usuario_id", ignoreDuplicates: true });

  if (error) {
    console.error("Falha ao entrar no grupo geral", error);
    return false;
  }
  return true;
}
