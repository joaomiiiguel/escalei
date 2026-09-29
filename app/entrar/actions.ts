"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/entrar?erro=email");
  const origin = (await headers()).get("origin")!;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/api/auth/callback` } });
  redirect(error ? "/entrar?erro=link" : "/entrar?enviado=1");
}

export async function signInWithGoogle() {
  const origin = (await headers()).get("origin")!;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/api/auth/callback` } });
  if (error || !data.url) redirect("/entrar?erro=google");
  redirect(data.url);
}
