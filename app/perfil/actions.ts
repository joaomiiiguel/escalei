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
