"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function isMockPhoneAuth() {
    return process.env.NODE_ENV === "development" && process.env.AUTH_PHONE_OTP_MODE === "mock";
}

export async function finishOnboarding(formData: FormData) {
    const apelido = String(formData.get("apelido") ?? "").trim();
    const clubeValor = String(formData.get("clube_coracao_id") ?? "");
    const clube = clubeValor ? Number(clubeValor) : null;
    const returnUrl = isMockPhoneAuth() ? "/onboarding?mock=1&" : "/onboarding?";
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(apelido))
        redirect(`${returnUrl}erro=apelido`);
    if (formData.get("aceite_termos") !== "on")
        redirect(`${returnUrl}erro=termos`);
    if (clubeValor && (!Number.isInteger(Number(clubeValor)) || Number(clubeValor) <= 0))
        redirect(`${returnUrl}erro=clube`);

    if (isMockPhoneAuth()) redirect("/como-funciona?mock=1");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/entrar");
    if (!user.phone) redirect("/entrar?erro=telefone");

    if (clube) {
        const { data: clubeAtivo } = await supabase
          .from("clubes")
          .select("id")
          .eq("id", clube)
          .eq("ativo", true)
          .maybeSingle();
        if (!clubeAtivo) redirect("/onboarding?erro=clube");
    }

    const { error } = await supabase.from("perfis").upsert({
      id: user.id,
      apelido,
      telefone: user.phone,
      clube_coracao_id: clube,
      termos_versao: "v1",
      termos_aceitos_em: new Date().toISOString(),
    });
    if (error?.code === "23505") redirect("/onboarding?erro=apelido_indisponivel");
    redirect(error ? "/onboarding?erro=perfil" : "/como-funciona");
}
