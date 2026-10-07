import { Navbar } from "@/components/ui/navbar";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Escalei", description: "Fantasy futebol" };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let hasCurrentTeam = false;

    if (user) {
        const { data: round } = await supabase.from("rodadas").select("id").eq("status", "ABERTA").gt("trava_em", new Date().toISOString()).order("numero", { ascending: false }).limit(1).maybeSingle();
        if (round) {
            const { data: team } = await supabase.from("times").select("id").eq("usuario_id", user.id).eq("rodada_id", round.id).maybeSingle();
            hasCurrentTeam = Boolean(team);
        }
    }

    return (
        <html lang="pt-BR">
            <body className="min-h-screen">
                {children}
                <Navbar hasCurrentTeam={hasCurrentTeam} />
            </body>
        </html>
    );
}
