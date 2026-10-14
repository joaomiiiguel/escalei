import { createAdminClient } from "@/lib/supabase/admin";

export type LeagueMembershipStatus = "ATIVA" | "INATIVA" | "NENHUMA";

export async function getLeagueMembershipStatus(userId: string): Promise<LeagueMembershipStatus> {
  const admin = createAdminClient();
  const { data: memberships, error: membershipsError } = await admin
    .from("ligas_membros")
    .select("liga_id")
    .eq("usuario_id", userId);

  if (membershipsError || !memberships?.length) return "NENHUMA";

  const { data: leagues, error: leaguesError } = await admin
    .from("ligas")
    .select("arquivada_em")
    .in("id", memberships.map((membership) => membership.liga_id));

  if (leaguesError || !leagues?.length) return "NENHUMA";
  return leagues.some((league) => league.arquivada_em === null) ? "ATIVA" : "INATIVA";
}

/** Verifica no servidor se o usuário participa de ao menos uma liga ativa. */
export async function hasActiveLeagueMembership(userId: string) {
  return await getLeagueMembershipStatus(userId) === "ATIVA";
}
