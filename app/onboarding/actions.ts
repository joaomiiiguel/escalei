"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/entrar");

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
      clube_coracao_id: clube,
      termos_versao: "v1",
      termos_aceitos_em: new Date().toISOString(),
    });
    if (error?.code === "23505") redirect("/onboarding?erro=apelido_indisponivel");
    redirect(error ? "/onboarding?erro=perfil" : "/");
}
