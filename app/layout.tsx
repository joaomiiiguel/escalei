import { Navbar } from "@/components/ui/navbar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRound } from "@/lib/current-round";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { PwaSetup } from "@/components/pwa/pwa-setup";
import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
    title: "Escalou - Mostre que você entende de futebol",
    description: "Fantasy futebol",
    applicationName: "Escalou",
    appleWebApp: { capable: true, title: "Escalou", statusBarStyle: "black" },
    icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
// Tema fixo: evita que o modo claro/escuro do sistema, iOS ou Android altere as cores.
// `minimumScale: 1`: se algum elemento passar da largura da tela, o Chrome do Android
// não reduz o zoom da página inteira para caber (JOA-161). O zoom com pinça continua liberado.
export const viewport: Viewport = { width: "device-width", initialScale: 1, minimumScale: 1, themeColor: "#050505", colorScheme: "dark" };
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
        <html lang="pt-BR" className="dark overflow-x-hidden">
            <body className="min-h-screen overflow-x-clip">
                <AnalyticsProvider userId={user?.id ?? null} />
                <PwaSetup />
                {children}
                <Navbar hasCurrentTeam={hasCurrentTeam} isRoundInProgress={isRoundInProgress} />
            </body>
        </html>
    );
}
