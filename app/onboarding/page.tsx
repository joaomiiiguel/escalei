import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { finishOnboarding } from "./actions";
import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ erro?: string; convite?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
    if (profile) redirect("/");
  }

  const { data: clubs } = await supabase
    .from("clubes")
    .select("id, nome, sigla, logo_url")
    .eq("ativo", true)
    .order("nome");

  return <OnboardingForm clubs={clubs ?? []} erro={params.erro} inviteToken={params.convite} finishOnboarding={finishOnboarding} />;
}
