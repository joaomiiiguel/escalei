import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { canUserJoinInvite, getActiveInvite, isInviteToken } from "@/lib/invites";
import { getOpenLeague, joinOpenLeague } from "@/lib/open-league";

export async function GET(request: Request) {
    const code = new URL(request.url).searchParams.get("code");
    if (!code) return NextResponse.redirect(new URL("/entrar?erro=callback", request.url));

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/entrar?erro=callback", request.url));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/entrar?erro=callback", request.url));

    const leagueMembershipStatus = await getLeagueMembershipStatus(user.id);
    if (leagueMembershipStatus === "ATIVA") {
      return NextResponse.redirect(new URL("/inicio", request.url));
    }

    const { data: profile } = await supabase
      .from("perfis")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    const inviteToken = request.headers.get("cookie")?.match(/(?:^|; )(?:escalou_invite|escalei_invite)=([^;]+)/)?.[1];
    const invite = leagueMembershipStatus === "NENHUMA" && inviteToken && isInviteToken(inviteToken) ? await getActiveInvite(inviteToken) : false;

    if (!invite) {
      // Sem convite: o cadastro é aberto e leva ao grupo geral, quando ele existe.
      if (await getOpenLeague()) {
        if (!profile) return NextResponse.redirect(new URL("/onboarding", request.url));
        if (await joinOpenLeague(user.id)) return NextResponse.redirect(new URL("/inicio", request.url));
      }
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`, request.url));
    }
    if (!inviteToken || !await canUserJoinInvite(inviteToken, user.id)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/entrar?erro=convite_email", request.url));
    }

    if (profile && user.email) {
      await supabase.from("perfis").update({ email: user.email.trim().toLowerCase() }).eq("id", user.id);
    }

    return NextResponse.redirect(new URL(profile ? `/convite/${inviteToken}` : `/onboarding?convite=${inviteToken}`, request.url));
}
