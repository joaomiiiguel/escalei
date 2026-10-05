"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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
  const icon = String(formData.get("icone") ?? "⚽").trim() || "⚽";
  const season = Number(formData.get("temporada"));
  if (name.length < 3 || name.length > 40 || icon.length > 8 || !Number.isInteger(season) || season < 2024 || season > 2100) {
    redirect("/admin/grupos?erro=grupo");
  }

  const { supabase, user } = await requireAdmin();
  const { data: group, error } = await supabase
    .from("ligas")
    .insert({
      nome: name,
      icone: icon,
      dono_id: user.id,
      codigo_convite: createInviteCode(),
      temporada: season,
    })
    .select("token_convite")
    .single();

  if (error || !group) redirect("/admin/grupos?erro=grupo");
  redirect(`/admin/grupos?criado=1&convite=${group.token_convite}`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar?saida=1");
}
