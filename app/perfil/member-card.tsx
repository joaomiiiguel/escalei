import type { ReactNode } from "react";
import { pitchPanel, scoreboard } from "@/components/ui/scoreboard";
import { TeamLogo } from "@/components/ui/team-logo";
import { formatPoints } from "@/lib/round-home";
import type { ProfileStats } from "@/lib/profile-stats";

type Club = { nome: string; sigla: string; logo_url: string | null };

type MemberCardProps = {
  apelido: string;
  club: Club | null;
  /** Data de criação do perfil. */
  memberSince: string;
  stats: ProfileStats;
  /** Ação de editar, encaixada no canto da carteirinha. */
  action?: ReactNode;
};

const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });

/** Carteirinha de sócio-torcedor do Escalou: quem é, para quem torce e como vem jogando. */
export function MemberCard({ apelido, club, memberSince, stats, action }: MemberCardProps) {
  const figures = [
    { label: stats.roundsPlayed === 1 ? "rodada jogada" : "rodadas jogadas", value: String(stats.roundsPlayed) },
    { label: "média por rodada", value: stats.averagePoints === null ? "—" : formatPoints(stats.averagePoints) },
    { label: stats.leagues === 1 ? "liga" : "ligas", value: String(stats.leagues) },
  ];

  return <section className={`${pitchPanel} p-5`} aria-labelledby="perfil-apelido">
    {action && <div className="flex justify-end">{action}</div>}
    <h1 id="perfil-apelido" className={`${scoreboard} break-all text-[clamp(36px,12vw,48px)] uppercase leading-[0.85] ${action ? "mt-3" : ""}`}>{apelido}</h1>
    <p className="mt-3 flex items-center gap-2 text-[15px] text-giz/80">
      {club
        ? <><TeamLogo className="size-5 shrink-0" logoUrl={club.logo_url} nome={club.nome} sigla={club.sigla} />Time do coração: <b className="text-giz">{club.nome}</b></>
        : "Sem time do coração definido"}
    </p>
    <p className="mt-1 text-sm text-giz/65">No Escalou desde <time dateTime={memberSince}>{monthYear.format(new Date(memberSince))}</time></p>

    <dl className="mt-5 grid grid-cols-3 divide-x divide-dashed divide-giz/25 border-t border-dashed border-giz/25 pt-4">
      {figures.map((figure) => <div key={figure.label} className="flex min-w-0 flex-col-reverse px-2 text-center first:pl-0 last:pr-0">
        <dt className="mt-1.5 text-[13px] leading-tight text-giz/65">{figure.label}</dt>
        <dd className={`${scoreboard} text-[32px] leading-none`}>{figure.value}</dd>
      </div>)}
    </dl>
  </section>;
}
