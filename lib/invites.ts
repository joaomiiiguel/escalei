import { createAdminClient } from "@/lib/supabase/admin";

export function isInviteToken(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function getActiveInvite(token: string) {
  if (!isInviteToken(token)) return false;

  const admin = createAdminClient();
  const { data: league } = await admin
    .from("ligas")
    .select("id, nome, icone, temporada, dono_id, arquivada_em, convite_expira_em")
    .eq("token_convite", token)
    .maybeSingle();

  if (!league || league.arquivada_em || (league.convite_expira_em && new Date(league.convite_expira_em) <= new Date())) {
    return false;
  }

  return league;
}

export async function addUserToInvitedLeague(token: string, userId: string) {
  const league = await getActiveInvite(token);
  if (!league) return false;

  const admin = createAdminClient();

  const { error } = await admin.from("ligas_membros").upsert({
    liga_id: league.id,
    usuario_id: userId,
    convidado_por: league.dono_id,
  }, { onConflict: "liga_id,usuario_id", ignoreDuplicates: true });

  return !error;
}
