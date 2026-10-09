"use client";

import { House, Shirt, Trophy, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HowItWorksModal } from "./how-it-works-modal";

const publicPaths = ["/entrar", "/onboarding", "/convite", "/admin"];

const items = [
  { href: "/", label: "Início", icon: House },
  { href: "/escalar", label: "Meu time", icon: Shirt },
  { href: "/ligas", label: "Ligas", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: UserRound },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar({ hasCurrentTeam = false }: { hasCurrentTeam?: boolean }) {
  const pathname = usePathname();

  if (publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;

  if (pathname === '/como-funciona') return null;

  return (
    <><HowItWorksModal /><div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg mb-5 px-4" data-app-navbar>
      {pathname !== "/escalar" && pathname === "/" && !hasCurrentTeam && (
        <div className="bg-background pb-3">
          <Link
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-primary px-5 text-base font-bold !text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            href="/escalar"
          >
            <Shirt className="size-[18px]" aria-hidden="true" />
            Escalar meu time
          </Link>
        </div>
      )}
      <nav className="border-t border-border bg-card bg-opacity/80 backdrop-blur-sm rounded-full overflow-hidden h-14" aria-label="Navegação principal">
        <ul className="grid grid-cols-4 h-full items-center">
          {items.map(({ href, icon: Icon, label }) => {
            const active = href ? isActive(pathname, href) : false;
            const content = <>
              <span className={`flex flex-col w-full h-full items-center justify-center gap-1 ${active ? "bg-primary/12" : "bg-transparent"}`}>
                <Icon className="size-[22px]" aria-hidden="true" />
              </span>
            </>;

            return <li className="flex" key={label}>
              <Link
                className={`flex w-full h-14 flex-col items-center justify-center gap-[3px] text-[10px] outline-none transition focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-ring ${active ? "font-bold text-primary" : "font-semibold text-muted-foreground hover:text-foreground"}`}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {content}
              </Link>
            </li>;
          })}
        </ul>
      </nav>
    </div></>
  );
}
