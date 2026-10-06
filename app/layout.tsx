import { Navbar } from "@/components/ui/navbar";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Escalei", description: "Fantasy futebol" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="pt-BR">
            <body>
                {children}
                <Navbar />
            </body>
        </html>
    );
}
