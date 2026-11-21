"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { scoreboard } from "@/components/ui/scoreboard";

export type RankingView = "rodada" | "campeonato";

const VIEWS: Array<{ value: RankingView; label: string }> = [
  { value: "rodada", label: "Rodada" },
  { value: "campeonato", label: "Campeonato" },
];

function viewHref(leagueId: string, view: RankingView): string {
  return view === "rodada" ? `/ligas/${leagueId}` : `/ligas/${leagueId}?visao=campeonato`;
}

/** Abas de ranking: a aba escolhida já fica marcada e mostra o carregamento até a nova tabela chegar. */
export function RankingViewTabs({ leagueId, active }: { leagueId: string; active: RankingView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requested, setRequested] = useState<RankingView | null>(null);
  const loadingView = isPending ? requested : null;
  const highlighted = loadingView ?? active;

  return <nav aria-label="Tipo de ranking" className="grid grid-cols-2 gap-1 rounded-full border border-giz/15 bg-background/70 p-1">
    {VIEWS.map((view) => {
      const isActive = view.value === highlighted;
      const isLoading = view.value === loadingView;
      const href = viewHref(leagueId, view.value);
      return <Link
        key={view.value}
        href={href}
        aria-current={view.value === active ? "page" : undefined}
        aria-busy={isLoading || undefined}
        onClick={(event) => {
          // Mantém abrir em nova aba (ctrl/cmd/clique do meio) com o comportamento padrão do link.
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
          event.preventDefault();
          if (view.value === active && !isPending) return;
          setRequested(view.value);
          startTransition(() => router.push(href));
        }}
        className={`${scoreboard} flex h-10 items-center justify-center gap-2 rounded-full px-3 text-[19px] uppercase leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-giz ${isActive ? "bg-primary text-primary-foreground" : "text-giz/75 hover:text-giz"}`}
      >
        {isLoading && <Loader2 data-testid="ranking-view-loading" className="size-4 animate-spin" aria-hidden="true" />}
        {view.label}
        {isLoading && <span className="sr-only">, carregando</span>}
      </Link>;
    })}
  </nav>;
}
