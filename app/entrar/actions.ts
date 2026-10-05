"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("senha") ?? "");
  return { email, password, isEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) };
}

export async function signInWithEmail(formData: FormData) {
  const { email, password, isEmail } = credentials(formData);
  if (!isEmail || password.length < 8) redirect("/entrar?erro=campos");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/entrar?erro=credenciais");
  redirect("/");
}

export async function signUpWithEmail(formData: FormData) {
  const { email, password, isEmail } = credentials(formData);
  if (!isEmail || password.length < 8 || password !== String(formData.get("confirmar_senha") ?? "")) redirect("/entrar?criar=1&erro=campos");
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${siteUrl}/api/auth/callback` } });
  if (error) redirect("/entrar?criar=1&erro=cadastro");
  redirect(data.session ? "/onboarding" : "/entrar?sucesso=confirmacao");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${siteUrl}/api/auth/callback` } });
  if (error || !data.url) redirect("/entrar?erro=google");
  redirect(data.url);
}
