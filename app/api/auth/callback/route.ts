import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
    const code = new URL(request.url).searchParams.get("code");
    if (!code) return NextResponse.redirect(new URL("/entrar?erro=callback", request.url));

    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL("/entrar?erro=callback", request.url));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL("/entrar?erro=callback", request.url));

    const { data: profile } = await supabase
      .from("perfis")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.redirect(new URL(profile ? "/" : "/onboarding", request.url));
}
