import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasActiveLeagueMembership } from "@/lib/league-access";
import { ComoFuncionaFlow } from "./como-funciona-flow";

export default async function ComoFunciona() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");
  if (!await hasActiveLeagueMembership(user.id)) redirect("/entrar?erro=sem_liga");
  if (user) {
    const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
    if (!profile) redirect("/onboarding");
  }

  return <ComoFuncionaFlow />;
}
