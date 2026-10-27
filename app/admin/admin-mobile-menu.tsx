"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { AdminNav } from "./admin-nav";
import { signOut } from "./actions";

const PANEL_ID = "admin-menu-mobile";

/** Cabeçalho e menu do admin abaixo de `lg`, onde a barra lateral fica oculta. */
export function AdminMobileMenu({ apelido }: { apelido: string | null }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => setOpen(false), [pathname]);

    useEffect(() => {
        if (!open) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", closeOnEscape);
        return () => window.removeEventListener("keydown", closeOnEscape);
    }, [open]);

    return (
        <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center justify-between px-5">
                <div className="flex items-baseline gap-2">
                    <Logo size="sm" className="m-0" />
                    <span className="text-xs font-semibold text-muted-foreground">Administração</span>
                </div>
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={PANEL_ID}
                    aria-label={open ? "Fechar menu" : "Abrir menu"}
                    onClick={() => setOpen((current) => !current)}
                    className="grid size-10 place-items-center rounded-lg text-neutral-100 transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
                </button>
            </div>
            {open && (
                <div id={PANEL_ID} className="grid gap-4 border-t border-neutral-800 px-5 pb-5 pt-3">
                    <AdminNav className="" onNavigate={() => setOpen(false)} />
                    <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-800/50 p-3">
                        <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-xs font-extrabold text-primary">{apelido?.slice(0, 2).toUpperCase() ?? "AD"}</span>
                        <div><p className="m-0 text-sm font-bold">{apelido ?? "Administrador"}</p><p className="m-0 text-xs text-muted-foreground">Admin</p></div>
                    </div>
                    <form action={signOut}>
                        <Button type="submit" variant="outline" className="h-10 w-full"><LogOut aria-hidden="true" />Sair</Button>
                    </form>
                </div>
            )}
        </header>
    );
}
