"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addUserToInvitedLeague } from "@/lib/invites";

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?convite=${token}`);

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirect(`/onboarding?convite=${token}`);

  const joined = await addUserToInvitedLeague(token, user.id);
  redirect(joined ? "/" : `/convite/${token}?erro=indisponivel`);
}
