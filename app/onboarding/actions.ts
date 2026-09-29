"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function finishOnboarding(formData: FormData) {
    const apelido = String(formData.get("apelido") ?? "").trim();
    const clube = Number(formData.get("clube_coracao_id"));
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(apelido))
        redirect("/onboarding?erro=apelido");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/entrar");
    const { error } = await supabase.from("perfis").upsert({ id: user.id, apelido, clube_coracao_id: clube || null, termos_versao: "v1", termos_aceitos_em: new Date().toISOString() });
    redirect(error ? "/onboarding?erro=perfil" : "/perfil");
}
