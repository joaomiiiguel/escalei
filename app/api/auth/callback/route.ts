import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { canUserJoinInvite, getActiveInvite, isInviteToken } from "@/lib/invites";
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
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (leagueMembershipStatus === "INATIVA") {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/entrar?erro=grupo_inativado", request.url));
    }

    const inviteToken = request.headers.get("cookie")?.match(/(?:^|; )(?:escalou_invite|escalei_invite)=([^;]+)/)?.[1];
    const invite = inviteToken && isInviteToken(inviteToken) ? await getActiveInvite(inviteToken) : false;
    if (!invite) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/entrar?erro=sem_liga", request.url));
    }
    if (!inviteToken || !await canUserJoinInvite(inviteToken, user.id)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/entrar?erro=convite_email", request.url));
    }

    const { data: profile } = await supabase
      .from("perfis")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile && user.email) {
      await supabase.from("perfis").update({ email: user.email.trim().toLowerCase() }).eq("id", user.id);
    }

    return NextResponse.redirect(new URL(profile ? `/convite/${inviteToken}` : `/onboarding?convite=${inviteToken}`, request.url));
}
