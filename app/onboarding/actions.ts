"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { addUserToInvitedLeague, isInviteToken } from "@/lib/invites";

export async function finishOnboarding(formData: FormData) {
    const apelido = String(formData.get("apelido") ?? "").trim();
    const clubeValor = String(formData.get("clube_coracao_id") ?? "");
    const clube = clubeValor ? Number(clubeValor) : null;
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(apelido))
        redirect("/onboarding?erro=apelido");
    if (formData.get("aceite_termos") !== "on")
        redirect("/onboarding?erro=termos");
    if (clubeValor && (!Number.isInteger(Number(clubeValor)) || Number(clubeValor) <= 0))
        redirect("/onboarding?erro=clube");

    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data: { user: signedInUser } } = await supabase.auth.getUser();
    if (!signedInUser) redirect("/entrar?erro=autenticacao");
    const user = signedInUser;

    if (clube) {
        const { data: clubeAtivo } = await supabase
          .from("clubes")
          .select("id")
          .eq("id", clube)
          .eq("ativo", true)
          .maybeSingle();
        if (!clubeAtivo) redirect("/onboarding?erro=clube");
    }

    const { data: profile, error } = await supabase
      .from("perfis")
      .upsert({
        id: user.id,
        apelido,
        clube_coracao_id: clube,
        telefone: cookieStore.get("escalei_verified_phone")?.value ?? null,
        termos_versao: "v1",
        termos_aceitos_em: new Date().toISOString(),
      }, { onConflict: "id" })
      .select("id")
      .single();

    if (error?.code === "23505") redirect("/onboarding?erro=apelido_indisponivel");
    if (error || profile?.id !== user.id) redirect("/onboarding?erro=perfil");

    cookieStore.delete("escalei_verified_phone");
    const inviteFromForm = String(formData.get("convite") ?? "");
    const inviteToken = isInviteToken(inviteFromForm)
      ? inviteFromForm
      : cookieStore.get("escalei_invite")?.value;
    if (inviteToken && isInviteToken(inviteToken)) {
      await addUserToInvitedLeague(inviteToken, user.id);
      cookieStore.delete("escalei_invite");
    }

    redirect("/");
}
