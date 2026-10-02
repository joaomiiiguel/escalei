import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComoFuncionaFlow } from "./como-funciona-flow";

function isMockPhoneAuth() {
  return process.env.NODE_ENV === "development" && process.env.AUTH_PHONE_OTP_MODE === "mock";
}

export default async function ComoFunciona({ searchParams }: { searchParams: Promise<{ mock?: string }> }) {
  const params = await searchParams;
  const mock = params.mock === "1" && isMockPhoneAuth();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !mock) redirect("/entrar");

  return <ComoFuncionaFlow />;
}
