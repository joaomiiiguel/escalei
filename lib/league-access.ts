import { createAdminClient } from "@/lib/supabase/admin";

/** Verifica no servidor se o usuário participa de ao menos uma liga ativa. */
export async function hasActiveLeagueMembership(userId: string) {
  const admin = createAdminClient();
  const { data: memberships, error: membershipsError } = await admin
    .from("ligas_membros")
    .select("liga_id")
    .eq("usuario_id", userId);

  if (membershipsError || !memberships?.length) return false;

  const { data: league, error: leaguesError } = await admin
    .from("ligas")
    .select("id")
    .in("id", memberships.map((membership) => membership.liga_id))
    .is("arquivada_em", null)
    .limit(1)
    .maybeSingle();

  return !leaguesError && Boolean(league);
}
