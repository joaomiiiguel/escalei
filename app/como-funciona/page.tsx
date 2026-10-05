import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComoFuncionaFlow } from "./como-funciona-flow";

export default async function ComoFunciona() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");
  if (user) {
    const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
    if (!profile) redirect("/onboarding");
  }

  return <ComoFuncionaFlow />;
}
