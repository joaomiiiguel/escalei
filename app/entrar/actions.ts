"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function callbackUrl() {
  const requestHeaders = await headers();
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    return new URL("/api/auth/callback", configuredUrl).toString();
  }

  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    throw new Error("URL pública do aplicativo não configurada.");
  }

  return new URL("/api/auth/callback", origin).toString();
}

export async function signInWithMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/entrar?erro=email");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: await callbackUrl() } });
  redirect(error ? "/entrar?erro=link" : "/entrar?enviado=1");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: await callbackUrl() } });
  if (error || !data.url) redirect("/entrar?erro=google");
  redirect(data.url);
}
