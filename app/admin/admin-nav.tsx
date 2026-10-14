"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
    const pathname = usePathname();

    const links = [
        { href: "/admin/grupos", label: "Grupos" },
        { href: "/admin/participantes", label: "Participantes" },
        // { href: "/admin/convites", label: "Convites" },
        // { href: "/admin/configuracoes", label: "Configurações" },
    ];

    return (
        <nav className="mt-8 grid gap-1 text-sm font-bold">
            {links.map((link) => {
                const isActive = pathname === link.href || pathname?.startsWith(link.href + "/");

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`rounded-lg px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isActive ? "bg-primary/15 text-primary" : "text-neutral-100 hover:bg-neutral-800"
                            }`}
                    >
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
