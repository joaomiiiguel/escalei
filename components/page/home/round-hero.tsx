import Link from "next/link";
import formatDateTime, { formatKickoffTime } from "@/lib/formatDate";
import { displayedKickoff } from "@/lib/game-kickoff";
import { formatPoints, type RoundFigure, type RoundMessage, type RoundProgress } from "@/lib/round-home";
import type { Clube, Jogo, Rodada, StatusJogo } from "@/lib/types";
import { LockCountdown } from "./lock-countdown";
import { pitchPanel, scoreboard } from "@/components/ui/scoreboard";

const pitch = `${pitchPanel} p-5`;

type Status = { label: string; dot: string };

const roundStatus: Record<Rodada["status"], Status> = {
  AGENDADA: { label: "Em breve", dot: "bg-giz/60" },
  ABERTA: { label: "Mercado aberto", dot: "bg-primary" },
  EM_ANDAMENTO: { label: "Jogos rolando", dot: "bg-warning motion-safe:animate-pulse" },
  FECHADA: { label: "Rodada fechada", dot: "bg-giz/60" },
};
// Com a rodada fechada, a ação principal da tela é compartilhar o resumo.
const cta = {
  strong: "bg-primary text-primary-foreground hover:bg-[#d6ff4d]",
  quiet: "border border-giz/30 text-giz hover:border-giz hover:bg-giz/10",
} as const;

const lockedStatus: Status = { label: "Escalação travada", dot: "bg-giz/60" };

const gameTick: Record<StatusJogo, string> = {
  ENCERRADO: "bg-primary",
  EM_ANDAMENTO: "bg-warning motion-safe:animate-pulse",
  A_JOGAR: "bg-giz/15",
  ADIADO: "bg-giz/15 [background-image:repeating-linear-gradient(135deg,transparent_0_3px,rgb(5_5_5/0.6)_3px_5px)]",
  CANCELADO: "bg-giz/15 [background-image:repeating-linear-gradient(135deg,transparent_0_3px,rgb(5_5_5/0.6)_3px_5px)]",
};

type RoundHeroProps = {
  round: Rodada;
  figure: RoundFigure;
  message: RoundMessage;
  progress: RoundProgress;
  games: Jogo[];
  clubsById: Map<number, Clube>;
  hasTeam: boolean;
  now: Date;
};

/** Placar da rodada: o número que importa agora, o andamento dos jogos e o próximo passo do usuário. */
export function RoundHero({ round, figure, message, progress, games, clubsById, hasTeam, now }: RoundHeroProps) {
  const locked = round.status === "ABERTA" && now >= new Date(round.trava_em);
  const status = locked ? lockedStatus : roundStatus[round.status];
  const showsProgress = figure?.kind !== "countdown" && progress.totalGames > 0;
  const matchLabel = (game: Jogo) => `${clubsById.get(game.clube_casa_id)?.sigla ?? "—"} × ${clubsById.get(game.clube_fora_id)?.sigla ?? "—"}`;

  return (
    <section
      aria-labelledby="rodada-titulo"
      className={`${pitch} shadow-[0_20px_50px_-20px_rgb(0_0_0/0.8)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 id="rodada-titulo" className={`${scoreboard} text-[34px] uppercase leading-[0.85]`}>Rodada {round.numero}</h1>
          {round.temporada && <p className="mt-1 text-sm text-giz/70">Brasileirão {round.temporada}</p>}
        </div>
        <p className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-giz/15 bg-background/60 px-3 text-[13px] font-bold">
          <span aria-hidden="true" className={`size-2 rounded-full ${status.dot}`} />
          {status.label}
        </p>
      </div>

      {figure && <div className="mt-7">
        {figure.kind === "countdown" && <>
          <LockCountdown until={figure.until} serverNow={now.toISOString()} />
          <p className="mt-3 text-[15px] text-giz/80">
            {figure.caption} <time dateTime={figure.until} className="font-bold text-giz">{formatDateTime(figure.until)}</time>
          </p>
        </>}
        {figure.kind === "points" && <p className="flex flex-wrap items-baseline gap-x-3">
          <strong className={`${scoreboard} text-[clamp(72px,26vw,104px)] leading-[0.8] text-primary`}>{formatPoints(progress.points)}</strong>
          <span className="text-[15px] font-bold text-giz/80">{figure.caption}</span>
        </p>}
        {figure.kind === "games" && <p className="flex flex-wrap items-baseline gap-x-3">
          <strong className={`${scoreboard} text-[clamp(72px,26vw,104px)] leading-[0.8]`}>
            {progress.completedGames}<span className="text-giz/40">/{progress.totalGames}</span>
          </strong>
          <span className="text-[15px] font-bold text-giz/80">{figure.caption}</span>
        </p>}
      </div>}

      {showsProgress && <div className="mt-6">
        <ol className="grid grid-flow-col auto-cols-fr gap-1" aria-hidden="true">
          {games.map((game) => <li key={game.id} className={`h-2 rounded-[3px] ${gameTick[game.status]}`} />)}
        </ol>
        <div className="mt-3 grid gap-1 text-sm text-giz/80">
          {figure?.kind !== "games" && <p>
            <b className="text-giz">{progress.completedGames} de {progress.totalGames}</b> jogos encerrados{progress.liveGames > 0 && `, ${progress.liveGames} em andamento`}
          </p>}
          {hasTeam && round.status !== "FECHADA" && <p>
            <b className="text-giz">{progress.scoredPlayers} de {progress.selectedPlayers}</b> jogadores do seu time já pontuaram
          </p>}
          {round.status === "EM_ANDAMENTO" && progress.nextGame && <p>
            {progress.nextGame.status === "EM_ANDAMENTO" ? "Rolando agora" : "Próximo jogo"}: <b className="text-giz">{matchLabel(progress.nextGame)}</b>
            {progress.nextGame.status === "A_JOGAR" && <>, às {formatKickoffTime(displayedKickoff(progress.nextGame))}</>}
          </p>}
        </div>
      </div>}

      <div className="mt-6 border-t border-dashed border-giz/25 pt-5">
        <h2 className="text-lg font-extrabold leading-tight">{message.title}</h2>
        <p className="mt-1 text-[15px] leading-snug text-giz/75">{message.description}</p>
        {message.cta && <Link
          href="/escalar"
          className={`mt-4 flex min-h-12 w-full items-center justify-center rounded-[14px] px-5 text-base font-extrabold outline-none transition focus-visible:ring-[3px] focus-visible:ring-giz focus-visible:ring-offset-[3px] focus-visible:ring-offset-gramado-escuro ${cta[round.status === "FECHADA" ? "quiet" : "strong"]}`}
        >
          {message.cta}
        </Link>}
      </div>
    </section>
  );
}

/** Mesmo painel para quando não há rodada para mostrar. */
export function RoundHeroEmpty({ title, description, action }: { title: string; description: string; action?: { label: string; href: string } }) {
  return (
    <section aria-labelledby="rodada-titulo" className={pitch}>
      <h1 id="rodada-titulo" className={`${scoreboard} text-[34px] uppercase leading-[0.85]`}>{title}</h1>
      <p className="mt-3 text-[15px] leading-snug text-giz/75">{description}</p>
      {action && <Link href={action.href} className="mt-4 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-giz">{action.label}</Link>}
    </section>
  );
}
