import { LayoutDashboard } from "lucide-react";
import Link from "next/link";

/** Atalho flutuante para o painel admin; ocupa o lugar do botão "Como funciona". */
export function AdminDashboardLink() {
  return (
    <Link
      href="/admin"
      className="fixed right-5 top-4 z-40 grid size-10 place-items-center rounded-full border border-border bg-card !text-foreground shadow-lg outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Dashboard do administrador"
    >
      <LayoutDashboard className="size-5" aria-hidden="true" />
    </Link>
  );
}
