import Link from "next/link";

export type RankingView = "rodada" | "campeonato";

const VIEWS: Array<{ value: RankingView; label: string }> = [
  { value: "rodada", label: "Rodada" },
  { value: "campeonato", label: "Campeonato" },
];

export function RankingViewTabs({ leagueId, active }: { leagueId: string; active: RankingView }) {
  return <nav aria-label="Tipo de ranking" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
    {VIEWS.map((view) => {
      const isActive = view.value === active;
      return <Link
        key={view.value}
        href={view.value === "rodada" ? `/ligas/${leagueId}` : `/ligas/${leagueId}?visao=campeonato`}
        aria-current={isActive ? "page" : undefined}
        className={`rounded-lg px-3 py-2 text-center text-sm font-extrabold outline-none transition focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        {view.label}
      </Link>;
    })}
  </nav>;
}
