import { pitchPanel, scoreboard } from "@/components/ui/scoreboard";
import { formatPoints } from "@/lib/league-ranking";
import { RankingViewTabs, type RankingView } from "./ranking-view-tabs";

type LeagueHeroProps = {
  leagueId: string;
  name: string;
  icon: string | null;
  meta: string;
  view: RankingView;
  /** Posição do usuário; `null` quando ainda não aparece na tabela. */
  position: number | null;
  total: number;
  /** Complemento da posição, ex.: "na rodada 12". */
  scope: string;
  gap: string;
  points: number | null;
};

/** Topo da liga: nome, troca entre rodada e campeonato e a posição do usuário em destaque. */
export function LeagueHero({ leagueId, name, icon, meta, view, position, total, scope, gap, points }: LeagueHeroProps) {
  return <section className={`${pitchPanel} p-5`} aria-labelledby="league-name">
    <div className="flex items-center gap-3.5">
      <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-2xl bg-background/60 text-[28px]">{icon || "⚽"}</span>
      <div className="min-w-0">
        <h1 id="league-name" className={`${scoreboard} line-clamp-2 text-[30px] uppercase leading-[0.9]`}>{name}</h1>
        <p className="mt-1 text-sm text-giz/70">{meta}</p>
      </div>
    </div>

    <div className="mt-5"><RankingViewTabs leagueId={leagueId} active={view} /></div>

    <div className="mt-6" role="group" aria-label={view === "campeonato" ? "Seu desempenho no campeonato" : "Seu desempenho na rodada"}>
      <p className="flex flex-wrap items-baseline gap-x-3">
        <strong className={`${scoreboard} text-[clamp(72px,26vw,104px)] leading-[0.8] text-primary`}>{position ? `${position}º` : "—"}</strong>
        <span className="text-[15px] font-bold text-giz/80">de {total} {scope}</span>
      </p>
      <p className="mt-3 text-[15px] text-giz/80">
        <b className="text-giz">{gap}</b>
        {points !== null && <>, com {formatPoints(points)} pts</>}
      </p>
    </div>
  </section>;
}
