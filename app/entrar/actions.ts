"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveInvite, isInviteToken } from "@/lib/invites";

async function validInviteToken(formData: FormData) {
  const token = String(formData.get("convite") ?? "");
  return isInviteToken(token) && await getActiveInvite(token) ? token : null;
}

export async function signInWithGoogle(formData: FormData) {
  const inviteToken = await validInviteToken(formData);
  if (inviteToken) {
    const cookieStore = await cookies();
    cookieStore.set("escalou_invite", inviteToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 });
  }
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${siteUrl}/api/auth/callback` } });
  if (error || !data.url) redirect(inviteToken ? `/entrar?convite=${inviteToken}&erro=google` : "/entrar?erro=google");
  redirect(data.url);
}
