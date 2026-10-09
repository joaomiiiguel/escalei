import { TeamLogo } from "./team-logo";

type Club = { nome: string; sigla: string; logoUrl?: string | null };
type MatchStatus = "A_JOGAR" | "EM_ANDAMENTO" | "ENCERRADO" | "ADIADO" | "CANCELADO";

type ScoreCardProps = {
  away: Club;
  awayGoals: number | null;
  home: Club;
  homeGoals: number | null;
  kickoff: string;
  status: MatchStatus;
};

const timeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit" });

function centerContent({ awayGoals, homeGoals, kickoff, status }: Pick<ScoreCardProps, "awayGoals" | "homeGoals" | "kickoff" | "status">) {
  if (status === "EM_ANDAMENTO") return { main: `${homeGoals ?? 0} × ${awayGoals ?? 0}`, secondary: "Ao vivo" };
  if (status === "ENCERRADO") return { main: homeGoals !== null && awayGoals !== null ? `${homeGoals} × ${awayGoals}` : "— × —", secondary: "pontuado ✓" };
  if (status === "ADIADO") return { main: "—", secondary: "Adiado" };
  if (status === "CANCELADO") return { main: "—", secondary: "Cancelado" };
  return { main: timeFormatter.format(new Date(kickoff)), secondary: dateFormatter.format(new Date(kickoff)) };
}

export function ScoreCard({ away, awayGoals, home, homeGoals, kickoff, status }: ScoreCardProps) {
  const center = centerContent({ awayGoals, homeGoals, kickoff, status });

  return <article className="grid grid-cols-[minmax(0,1fr)_112px_minmax(0,1fr)] items-center gap-2 rounded-[14px] bg-card px-3.5 py-3" aria-label={`${home.nome} contra ${away.nome}`}>
    <div className="flex min-w-0 items-center justify-end gap-2 text-right">
      <span className="truncate text-[15px] font-extrabold tracking-[0.5px] text-foreground">{home.sigla}</span>
      <TeamLogo className="size-7 shrink-0" logoUrl={home.logoUrl} nome={home.nome} sigla={home.sigla} />
    </div>
    <div className="grid justify-items-center gap-0.5 text-center">
      <strong className="font-mono text-[17px] leading-none text-foreground">{center.main}</strong>
      <span className={`text-[11px] font-semibold ${status === "EM_ANDAMENTO" || status === "ENCERRADO" ? "text-primary" : "text-muted-foreground"}`}>{center.secondary}</span>
    </div>
    <div className="flex min-w-0 items-center gap-2">
      <TeamLogo className="size-7 shrink-0" logoUrl={away.logoUrl} nome={away.nome} sigla={away.sigla} />
      <span className="truncate text-[15px] font-extrabold tracking-[0.5px] text-foreground">{away.sigla}</span>
    </div>
  </article>;
}
