import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { finishOnboarding } from "./actions";
import { OnboardingForm } from "./onboarding-form";

function isMockPhoneAuth() {
  return process.env.NODE_ENV === "development" && process.env.AUTH_PHONE_OTP_MODE === "mock";
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ erro?: string; mock?: string }> }) {
  const params = await searchParams;
  const mock = params.mock === "1" && isMockPhoneAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !mock) redirect("/entrar");

  if (user) {
    const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
    if (profile) redirect("/");
  }

  const { data: clubs } = await supabase
    .from("clubes")
    .select("id, nome, sigla, logo_url")
    .eq("ativo", true)
    .order("nome");

  return <OnboardingForm clubs={clubs ?? []} erro={params.erro} finishOnboarding={finishOnboarding} />;
}
