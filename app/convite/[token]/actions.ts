"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addUserToInvitedLeague, canUserJoinInvite } from "@/lib/invites";
import { trackServerEvent } from "@/lib/analytics/server";

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?convite=${token}`);
  if (!await canUserJoinInvite(token, user.id)) redirect(`/convite/${token}?erro=email`);

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirect(`/onboarding?convite=${token}`);

  const joined = await addUserToInvitedLeague(token, user.id);
  if (joined) trackServerEvent(user.id, "convite_aceito", {});
  redirect(joined ? "/" : `/convite/${token}?erro=indisponivel`);
}
