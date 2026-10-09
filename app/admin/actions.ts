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
    redirect("/admin/grupos?erro=grupo");
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
    redirect("/admin/grupos?erro=grupo");
  }

  const { data: group, error } = await supabase
    .from("ligas")
    .insert({
      nome: name,
      dono_id: user.id,
      codigo_convite: createInviteCode(),
      temporada: season,
    })
    .select("token_convite")
    .single();

  if (error || !group) redirect("/admin/grupos?erro=grupo");
  redirect(`/admin/grupos?criado=1&convite=${group.token_convite}`);
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

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar?saida=1");
}
