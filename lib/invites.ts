import { createAdminClient } from "@/lib/supabase/admin";

export function isInviteToken(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function isInviteCode(value: string | null | undefined) {
  return Boolean(value && /^[A-HJ-NP-Z2-9]{8}$/.test(value));
}

export async function getInviteTokenByCode(code: string) {
  if (!isInviteCode(code)) return null;
  const admin = createAdminClient();
  const { data: league } = await admin.from("ligas")
    .select("token_convite, arquivada_em, convite_expira_em")
    .eq("codigo_convite", code)
    .maybeSingle();
  if (!league || league.arquivada_em || (league.convite_expira_em && new Date(league.convite_expira_em) <= new Date())) return null;
  return league.token_convite;
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

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() ?? "";
}

export async function canUserJoinInvite(token: string, userId: string) {
  const league = await getActiveInvite(token);
  if (!league) return false;

  const admin = createAdminClient();
  const { data: authResult, error: authError } = await admin.auth.admin.getUserById(userId);
  const email = normalizeEmail(authResult.user?.email);
  if (authError || !email) return false;

  const { data: authorization, error } = await admin
    .from("ligas_convites_email")
    .select("liga_id")
    .eq("liga_id", league.id)
    .eq("email", email)
    .maybeSingle();
  return !error && Boolean(authorization);
}

export async function addUserToInvitedLeague(token: string, userId: string) {
  const league = await getActiveInvite(token);
  if (!league || !await canUserJoinInvite(token, userId)) return false;

  const admin = createAdminClient();

  const { error } = await admin.from("ligas_membros").upsert({
    liga_id: league.id,
    usuario_id: userId,
    convidado_por: league.dono_id,
  }, { onConflict: "liga_id,usuario_id", ignoreDuplicates: true });

  if (error) return false;

  const { error: inviteError } = await admin
    .from("ligas_convites_email")
    .update({ usuario_id: userId, aceito_em: new Date().toISOString() })
    .eq("liga_id", league.id)
    .eq("email", normalizeEmail((await admin.auth.admin.getUserById(userId)).data.user?.email));
  return !inviteError;
}
