"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createInviteCode() {
  return Array.from(randomBytes(8), (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length]).join("");
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: admin } = await supabase
    .from("administradores")
    .select("usuario_id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/");
  return { supabase, user };
}

export async function createGroup(formData: FormData) {
  const name = String(formData.get("nome") ?? "").trim();
  if (name.length < 3 || name.length > 40) {
    redirect("/admin/grupos/novo?erro=grupo");
  }

  const { supabase, user } = await requireAdmin();
  const admin = createAdminClient();
  const { data: seasonConfig, error: seasonConfigError } = await admin
    .from("configuracoes")
    .select("valor")
    .eq("chave", "temporada_atual")
    .maybeSingle();
  const season = typeof seasonConfig?.valor === "number" ? seasonConfig.valor : Number(seasonConfig?.valor);
  if (seasonConfigError || !Number.isInteger(season) || season < 2024 || season > 2100) {
    redirect("/admin/grupos/novo?erro=grupo");
  }

  const { data: group, error } = await admin
    .from("ligas")
    .insert({
      nome: name,
      dono_id: user.id,
      codigo_convite: createInviteCode(),
      temporada: season,
    })
    .select("id, token_convite")
    .single();

  if (error || !group) redirect("/admin/grupos/novo?erro=grupo");
  const { error: ownerMembershipError } = await admin.from("ligas_membros").upsert({
    liga_id: group.id,
    usuario_id: user.id,
    convidado_por: user.id,
  }, { onConflict: "liga_id,usuario_id", ignoreDuplicates: true });
  if (ownerMembershipError) redirect("/admin/grupos/novo?erro=grupo");
  redirect("/admin/grupos");
}

export async function addGroupMember(formData: FormData) {
  const groupId = String(formData.get("grupo_id") ?? "");
  const userId = String(formData.get("usuario_id") ?? "");
  if (!UUID_PATTERN.test(groupId) || !UUID_PATTERN.test(userId)) redirect("/admin/grupos?erro=grupo");

  const { supabase, user } = await requireAdmin();
  const { data: group } = await supabase.from("ligas").select("id").eq("id", groupId).is("arquivada_em", null).maybeSingle();
  if (!group) redirect("/admin/grupos?erro=grupo");

  const { error } = await supabase.from("ligas_membros").upsert({
    liga_id: groupId,
    usuario_id: userId,
    convidado_por: user.id,
  }, { onConflict: "liga_id,usuario_id", ignoreDuplicates: true });
  redirect(`/admin/grupos/${groupId}${error ? "?erro=adicionar" : "?adicionado=1"}`);
}

export async function addGroupInviteEmail(formData: FormData) {
  const groupId = String(formData.get("grupo_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!UUID_PATTERN.test(groupId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect(`/admin/grupos/${groupId}?erro=convite_email`);

  const { user } = await requireAdmin();
  const admin = createAdminClient();
  const { data: group } = await admin.from("ligas").select("id").eq("id", groupId).is("arquivada_em", null).maybeSingle();
  if (!group) redirect("/admin/grupos?erro=grupo");

  const { error } = await admin.from("ligas_convites_email").upsert({
    liga_id: groupId,
    email,
    convidado_por: user.id,
  }, { onConflict: "liga_id,email", ignoreDuplicates: true });
  redirect(`/admin/grupos/${groupId}${error ? "?erro=convite_email" : "?convite_email=1"}`);
}

export async function removeGroupMember(formData: FormData) {
  const groupId = String(formData.get("grupo_id") ?? "");
  const userId = String(formData.get("usuario_id") ?? "");
  if (!UUID_PATTERN.test(groupId) || !UUID_PATTERN.test(userId)) redirect("/admin/grupos?erro=grupo");

  const { supabase } = await requireAdmin();
  const { data: group } = await supabase.from("ligas").select("id, dono_id").eq("id", groupId).is("arquivada_em", null).maybeSingle();
  if (!group) redirect("/admin/grupos?erro=grupo");
  if (group.dono_id === userId) redirect(`/admin/grupos/${groupId}?erro=dono`);

  const { error } = await supabase.from("ligas_membros").delete().eq("liga_id", groupId).eq("usuario_id", userId);
  redirect(`/admin/grupos/${groupId}${error ? "?erro=remover" : "?removido=1"}`);
}

export async function deactivateGroup(formData: FormData) {
  const groupId = String(formData.get("grupo_id") ?? "");
  if (!UUID_PATTERN.test(groupId)) redirect("/admin/grupos?erro=grupo");

  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("ligas")
    .update({ arquivada_em: new Date().toISOString() })
    .eq("id", groupId)
    .is("arquivada_em", null);

  redirect(`/admin/grupos${error ? "?erro=grupo" : "?inativado=1"}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar?saida=1");
}
