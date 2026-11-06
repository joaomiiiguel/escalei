import Link from "next/link";
import { scoreboard } from "@/components/ui/scoreboard";

export type RankingView = "rodada" | "campeonato";

const VIEWS: Array<{ value: RankingView; label: string }> = [
  { value: "rodada", label: "Rodada" },
  { value: "campeonato", label: "Campeonato" },
];

export function RankingViewTabs({ leagueId, active }: { leagueId: string; active: RankingView }) {
  return <nav aria-label="Tipo de ranking" className="grid grid-cols-2 gap-1 rounded-full border border-giz/15 bg-background/70 p-1">
    {VIEWS.map((view) => {
      const isActive = view.value === active;
      return <Link
        key={view.value}
        href={view.value === "rodada" ? `/ligas/${leagueId}` : `/ligas/${leagueId}?visao=campeonato`}
        aria-current={isActive ? "page" : undefined}
        className={`${scoreboard} flex h-10 items-center justify-center rounded-full px-3 text-[19px] uppercase leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-giz ${isActive ? "bg-primary text-primary-foreground" : "text-giz/75 hover:text-giz"}`}
      >
        {view.label}
      </Link>;
    })}
  </nav>;
}
