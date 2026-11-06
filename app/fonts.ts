import { Sofia_Sans, Sofia_Sans_Extra_Condensed } from "next/font/google";

// Tipografia da marca, compartilhada pela landing e pelas telas do app.
export const display = Sofia_Sans_Extra_Condensed({ subsets: ["latin"], weight: ["800", "900"], variable: "--font-display" });
export const body = Sofia_Sans({ subsets: ["latin"], variable: "--font-body" });
