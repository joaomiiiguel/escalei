import { EmailSignIn } from "./email-sign-in";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "./actions";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SignIn({ searchParams }: { searchParams: Promise<{ criar?: string; erro?: string; sucesso?: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) redirect("/");

    const params = await searchParams;
    return <EmailSignIn createAccount={Boolean(params.criar)} error={params.erro} success={params.sucesso} signIn={signInWithEmail} signUp={signUpWithEmail} signInWithGoogle={signInWithGoogle} />;
}
