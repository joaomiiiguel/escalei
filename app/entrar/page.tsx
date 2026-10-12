import { GoogleSignIn } from "./email-sign-in";
import { signInWithGoogle } from "./actions";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveInvite, isInviteToken } from "@/lib/invites";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ erro?: string; convite?: string }> }) {
    const params = await searchParams;
    const candidateToken = params.convite;
    const inviteToken = candidateToken && isInviteToken(candidateToken) && await getActiveInvite(candidateToken) ? candidateToken : null;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/");

    return <GoogleSignIn error={params.erro} inviteToken={inviteToken ?? ""} signInWithGoogle={signInWithGoogle} />;
}
