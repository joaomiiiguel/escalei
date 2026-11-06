import { scoreboard } from "@/components/ui/scoreboard";
import { formatPoints, standingZone, type PositionChange, type StandingZone } from "@/lib/league-ranking";
import { PositionChangeIndicator } from "./position-change";

export type StandingRow = {
  usuario_id: string;
  apelido: string;
  club: string | null;
  points: number;
  position: number;
  isCurrentUser: boolean;
  detail: string | null;
  change: PositionChange | null;
};

const zoneBar: Record<Exclude<StandingZone, null>, string> = { lider: "bg-primary", lanterna: "bg-red-400" };

/** Tabela de classificação da liga, com faixa de zona à esquerda como na tabela do Brasileirão. */
export function StandingsTable({ rows, label }: { rows: StandingRow[]; label: string }) {
  const positions = rows.map((row) => row.position);
  const zones = rows.map((row) => standingZone(row.position, positions));

  return <>
    <ol aria-label={label} className="divide-y divide-border/70">
      {rows.map((row, index) => {
        const zone = zones[index];
        return <li key={row.usuario_id} className={`grid min-h-[60px] grid-cols-[4px_2.25rem_2rem_minmax(0,1fr)_auto] items-center gap-x-2 py-2 ${row.isCurrentUser ? "-mx-2 rounded-xl border-transparent bg-primary/10 px-2" : ""}`} aria-current={row.isCurrentUser || undefined}>
          <span aria-hidden="true" className={`h-9 rounded-full ${zone ? zoneBar[zone] : "bg-transparent"}`} />
          <strong className={`${scoreboard} text-[26px] leading-none ${row.position === 1 ? "text-primary" : ""}`}>{row.position}º</strong>
          <PositionChangeIndicator change={row.change} />
          <span className="min-w-0">
            <span className="flex min-w-0 items-baseline gap-2">
              <b className="truncate text-[15px]">{row.apelido}</b>
              {row.isCurrentUser && <span className="shrink-0 rounded-full bg-primary px-1.5 text-[11px] font-extrabold text-primary-foreground">você</span>}
            </span>
            <span className="block truncate text-[13px] text-giz/60">
              {[row.club, row.detail, zone === "lanterna" ? "lanterna" : null].filter(Boolean).join(", ") || " "}
            </span>
          </span>
          <span className={`${scoreboard} text-right text-[22px] leading-none`}>{formatPoints(row.points)}<span className="ml-0.5 font-(family-name:--font-body) text-xs font-bold text-giz/55">pts</span></span>
        </li>;
      })}
    </ol>
    {zones.some(Boolean) && <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-giz/65">
      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-1 rounded-full bg-primary" />Líder</span>
      {zones.includes("lanterna") && <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-3 w-1 rounded-full bg-red-400" />Lanterna</span>}
    </p>}
  </>;
}
