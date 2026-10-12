import { Navbar } from "@/components/ui/navbar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRound } from "@/lib/current-round";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Escalei", description: "Fantasy futebol" };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    let hasCurrentTeam = false;
    let isRoundInProgress = false;

    if (user) {
        const { data: round } = await getCurrentRound<{
            id: number;
            numero: number;
            status: "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA";
            trava_em: string;
        }>(supabase, "id, numero, status, trava_em");

        if (round) {
            isRoundInProgress = round.status === "EM_ANDAMENTO";
            const { data: team } = await supabase
                .from("times")
                .select("id")
                .eq("usuario_id", user.id)
                .eq("rodada_id", round.id)
                .maybeSingle();
            hasCurrentTeam = Boolean(team);
        }
    }

    return (
        <html lang="pt-BR">
            <body className="min-h-screen">
                {children}
                <Navbar hasCurrentTeam={hasCurrentTeam} isRoundInProgress={isRoundInProgress} />
            </body>
        </html>
    );
}
