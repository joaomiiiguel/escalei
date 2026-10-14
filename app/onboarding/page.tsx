import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { finishOnboarding } from "./actions";
import { OnboardingForm } from "./onboarding-form";
import { cookies } from "next/headers";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { canUserJoinInvite, getActiveInvite, isInviteToken } from "@/lib/invites";

export const dynamic = "force-dynamic";

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ erro?: string; convite?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const candidateToken = params.convite ?? cookieStore.get("escalei_invite")?.value;
  const inviteToken = candidateToken && isInviteToken(candidateToken) && await getActiveInvite(candidateToken) ? candidateToken : null;

  if (!user) redirect(inviteToken ? `/entrar?convite=${inviteToken}` : "/entrar");
  if (inviteToken && !await canUserJoinInvite(inviteToken, user.id)) redirect("/entrar?erro=convite_email");

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  const leagueMembershipStatus = await getLeagueMembershipStatus(user.id);
  if (leagueMembershipStatus === "ATIVA") redirect("/");
  if (!inviteToken) redirect(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`);
  if (profile) redirect(`/convite/${inviteToken}`);

  const { data: clubs } = await supabase
    .from("clubes")
    .select("id, nome, sigla, logo_url")
    .eq("ativo", true)
    .order("nome");

  return <OnboardingForm clubs={clubs ?? []} erro={params.erro} inviteToken={inviteToken} finishOnboarding={finishOnboarding} />;
}
