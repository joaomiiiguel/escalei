"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar?saida=1");
}

export async function updatePreferences(formData: FormData) {
  const tema = formData.get("tema") === "claro" ? "claro" : "escuro";
  const notificacoesEmail = formData.get("notificacoes_email") === "on";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { error } = await supabase
    .from("perfis")
    .update({ tema, notificacoes_email: notificacoesEmail })
    .eq("id", user.id);

  if (error) redirect("/perfil?erro=preferencias");
  revalidatePath("/perfil");
  redirect("/perfil?atualizado=1");
}

function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (/^\d{11}$/.test(digits)) return `+55${digits}`;
  if (/^55\d{11}$/.test(digits)) return `+${digits}`;
  return undefined;
}

export async function updateProfile(formData: FormData) {
  const apelido = String(formData.get("apelido") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const clubeValor = String(formData.get("clube_coracao_id") ?? "");
  const clubeCoracaoId = clubeValor ? Number(clubeValor) : null;
  const telefone = normalizeWhatsapp(String(formData.get("telefone") ?? ""));

  if (!/^[A-Za-z0-9_.]{3,20}$/.test(apelido)) redirect("/perfil?erro=apelido");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/perfil?erro=email");
  if (telefone === undefined) redirect("/perfil?erro=telefone");
  if (clubeValor && (clubeCoracaoId === null || !Number.isInteger(clubeCoracaoId) || clubeCoracaoId <= 0)) redirect("/perfil?erro=clube");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  if (clubeCoracaoId) {
    const { data: club } = await supabase.from("clubes").select("id").eq("id", clubeCoracaoId).eq("ativo", true).maybeSingle();
    if (!club) redirect("/perfil?erro=clube");
  }

  let emailPending = false;
  if (email !== user.email) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${siteUrl}/api/auth/callback` });
    if (error) redirect("/perfil?erro=email");
    emailPending = true;
  }

  const { error } = await supabase
    .from("perfis")
    .update({ apelido, clube_coracao_id: clubeCoracaoId, telefone })
    .eq("id", user.id);

  if (error?.code === "23505") redirect("/perfil?erro=indisponivel");
  if (error) redirect("/perfil?erro=perfil");

  revalidatePath("/perfil");
  redirect(`/perfil?atualizado=1${emailPending ? "&email_pendente=1" : ""}`);
}

export async function deleteAccount(formData: FormData) {
  if (formData.get("confirmacao") !== "EXCLUIR") {
    redirect("/perfil?erro=confirmacao");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) redirect("/perfil?erro=exclusao");

  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar?conta_excluida=1");
}
