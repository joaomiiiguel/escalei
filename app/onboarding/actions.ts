"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { addUserToInvitedLeague, canUserJoinInvite, getActiveInvite, isInviteToken } from "@/lib/invites";
import { hasActiveLeagueMembership } from "@/lib/league-access";

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
    const email = user.email?.trim().toLowerCase();
    if (!email) redirect("/entrar?erro=autenticacao");

    const inviteFromForm = String(formData.get("convite") ?? "");
    const inviteToken = isInviteToken(inviteFromForm)
      ? inviteFromForm
      : cookieStore.get("escalou_invite")?.value ?? cookieStore.get("escalei_invite")?.value;
    const hasMembership = await hasActiveLeagueMembership(user.id);
    const activeInvite = inviteToken && isInviteToken(inviteToken) ? await getActiveInvite(inviteToken) : false;
    if (!hasMembership && !activeInvite) redirect("/entrar?erro=sem_liga");
    if (activeInvite && (!inviteToken || !await canUserJoinInvite(inviteToken, user.id))) redirect("/entrar?erro=convite_email");

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
        email,
        apelido,
        clube_coracao_id: clube,
        telefone: cookieStore.get("escalou_verified_phone")?.value ?? cookieStore.get("escalei_verified_phone")?.value ?? null,
        termos_versao: "v1",
        termos_aceitos_em: new Date().toISOString(),
      }, { onConflict: "id" })
      .select("id")
      .single();

    if (error?.code === "23505") redirect("/onboarding?erro=apelido_indisponivel");
    if (error || profile?.id !== user.id) redirect("/onboarding?erro=perfil");

    cookieStore.delete("escalou_verified_phone");
    cookieStore.delete("escalei_verified_phone");
    if (inviteToken && isInviteToken(inviteToken)) {
      const joined = await addUserToInvitedLeague(inviteToken, user.id);
      if (!joined) redirect("/entrar?erro=sem_liga");
      cookieStore.delete("escalou_invite");
      cookieStore.delete("escalei_invite");
    }

    redirect("/");
}
