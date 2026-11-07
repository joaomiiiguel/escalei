import { CalendarDays, Check, Pencil, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { LineupFormation, type LineupPlayer } from "./lineup-formation";
import { PassInfo } from "./pass-info";
import { quietPanel, scoreboard } from "./scoreboard";
import { availabilityText, isUnavailable } from "@/lib/player-availability";
import type { PassStatus } from "@/lib/round-pass";
import { formatPoints } from "@/lib/round-home";

type Formation = "4-3-3" | "4-4-2" | "3-5-2";

const saoPaulo = "America/Sao_Paulo";

function currency(value: number) {
  return `C$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Linha de números do placar, separados por traços de giz. */
function ScoreLine({ items }: { items: Array<{ label: string; value: string }> }) {
  return <dl className={`${quietPanel} grid grid-cols-3 divide-x divide-dashed divide-giz/20 py-3.5`}>
    {items.map((item) => <div key={item.label} className="min-w-0 px-3 text-center">
      <dt className="text-[13px] text-giz/65">{item.label}</dt>
      <dd className={`${scoreboard} mt-1 truncate text-[24px] leading-none`}>{item.value}</dd>
    </div>)}
  </dl>;
}

export function SavedLineup({ budget, formation, passStatus, players, travaEm }: { budget: number; formation: Formation; passStatus?: PassStatus | null; players: LineupPlayer[]; travaEm: string }) {
  const spent = players.reduce((total, player) => total + player.price, 0);
  const unavailable = players.filter((player) => isUnavailable(player.status));
  const lockDate = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: saoPaulo }).format(new Date(travaEm));

  return <section className="flex min-h-0 flex-1 flex-col gap-4 pb-28" aria-label="Time salvo">
    <p className="flex items-start gap-3 rounded-[14px] border border-primary/40 bg-primary/10 p-3.5">
      <Check className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={3} aria-hidden="true" />
      <span className="text-[15px] leading-snug">
        <b className="block">Sua escalação está salva</b>
        <span className="text-giz/75">Dá para trocar jogadores até <time dateTime={travaEm} className="font-bold text-giz">{lockDate}</time>, uma hora antes do primeiro jogo da rodada.</span>
      </span>
    </p>
    <ScoreLine items={[{ label: "Formação", value: formation }, { label: "Custou", value: currency(spent) }, { label: "Sobram", value: currency(budget - spent) }]} />
    <LineupFormation className="h-[58vh] min-h-[420px] flex-none" formation={formation} initialPlayers={players} readOnly />
    {unavailable.length > 0 && <div role="alert" className="flex items-start gap-3 rounded-[14px] border border-destructive-foreground/30 bg-destructive px-4 py-3 text-destructive-foreground">
      <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-[15px] font-extrabold">Troque até a trava</p>
        <p className="mt-0.5 text-[13px] leading-snug">{unavailable.map((player) => `${player.name} (${availabilityText(player.status, player.statusReason)})`).join(", ")} não {unavailable.length === 1 ? "pode" : "podem"} ser {unavailable.length === 1 ? "escalado" : "escalados"}. Se continuar no time, soma 0 se não entrar em campo.</p>
      </div>
    </div>}
    {passStatus && <PassInfo hasSavedTeam status={passStatus} />}
    <div className="grid grid-cols-2 gap-2">
      <Link href="/inicio#jogos-da-rodada" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-giz/25 px-3 text-[15px] font-bold text-giz outline-none transition hover:border-giz focus-visible:ring-2 focus-visible:ring-giz"><CalendarDays className="size-4" aria-hidden="true" />Jogos da rodada</Link>
      <Link href="/escalar?editar=1" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-primary px-3 text-[15px] font-extrabold !text-primary-foreground outline-none transition hover:bg-[#d6ff4d] focus-visible:ring-2 focus-visible:ring-giz focus-visible:ring-offset-2 focus-visible:ring-offset-background"><Pencil className="size-4" aria-hidden="true" />Editar time</Link>
    </div>
  </section>;
}

const roundState = {
  EM_ANDAMENTO: { label: "Jogos rolando", dot: "bg-warning motion-safe:animate-pulse", caption: "pontos até agora" },
  AGENDADA: { label: "Em breve", dot: "bg-giz/60", caption: "pontos até agora" },
  FECHADA: { label: "Rodada fechada", dot: "bg-giz/60", caption: "pontos na rodada" },
} as const;

export function RoundLineup({ formation, players, roundNumber, status, finishedAt, lastUpdated }: { formation: Formation; players: LineupPlayer[]; roundNumber: number; status: "EM_ANDAMENTO" | "FECHADA" | "AGENDADA"; finishedAt?: string | null; lastUpdated?: string | null }) {
  const isClosed = status === "FECHADA";
  const state = roundState[status];
  const totalPoints = players.reduce((total, player) => total + (player.roundPoints ?? 0), 0);
  const finishedPlayers = players.filter((player) => player.roundStatus === "ENCERRADO");
  const livePlayers = players.filter((player) => player.roundStatus === "EM_ANDAMENTO");
  const scheduledPlayers = players.filter((player) => player.roundStatus === "A_JOGAR");
  const postponedPlayers = players.filter((player) => player.roundStatus === "ADIADO");
  const topPlayer = [...finishedPlayers].sort((first, second) => (second.roundPoints ?? 0) - (first.roundPoints ?? 0))[0];
  const nextPlayer = livePlayers[0] ?? scheduledPlayers[0];
  const dateTime = (value: string) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: saoPaulo }).format(new Date(value));

  return <section className="flex min-h-0 flex-1 flex-col gap-4 pb-28" aria-label="Meu time na rodada">
    <section className={`${quietPanel} p-5`} aria-label="Placar da rodada">
      <div className="flex items-start justify-between gap-3">
        <h2 className={`${scoreboard} text-[26px] uppercase leading-none`}>Rodada {roundNumber}</h2>
        <p className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full border border-giz/15 px-3 text-[13px] font-bold">
          <span aria-hidden="true" className={`size-2 rounded-full ${state.dot}`} />{state.label}
        </p>
      </div>
      <p className="mt-5 flex flex-wrap items-baseline gap-x-3">
        <strong className={`${scoreboard} text-[clamp(64px,22vw,96px)] leading-[0.8] ${totalPoints < 0 ? "text-warning" : "text-primary"}`}>{formatPoints(totalPoints)}</strong>
        <span className="text-[15px] font-bold text-giz/80">{state.caption}</span>
      </p>
      <div className="mt-5 grid gap-1 text-sm text-giz/80">
        <p>
          <b className="text-giz">{finishedPlayers.length} de {players.length || 11}</b> já pontuaram
          {!isClosed && livePlayers.length > 0 && `, ${livePlayers.length} em campo`}
          {!isClosed && scheduledPlayers.length > 0 && `, ${scheduledPlayers.length} a jogar`}
        </p>
        {isClosed && topPlayer && <p>Craque do seu time: <b className="text-giz">{topPlayer.name}</b>, <span className="text-primary">{formatPoints(topPlayer.roundPoints ?? 0)} pts</span></p>}
        {!isClosed && nextPlayer && <p>{nextPlayer.roundStatus === "EM_ANDAMENTO" ? "Em campo agora" : "Próximo a jogar"}: <b className="text-giz">{nextPlayer.name}</b>{nextPlayer.roundStatus === "A_JOGAR" && nextPlayer.roundLabel && `, às ${nextPlayer.roundLabel}`}</p>}
        {isClosed && <p>Pontuação oficial{finishedAt ? <>, fechada em <time dateTime={finishedAt}>{dateTime(finishedAt)}</time></> : " confirmada"}.</p>}
        {!isClosed && lastUpdated && <p className="text-giz/60">Atualizado em <time dateTime={lastUpdated}>{dateTime(lastUpdated)}</time></p>}
      </div>
    </section>
    <LineupFormation className="h-[58vh] min-h-[420px] flex-none" formation={formation} initialPlayers={players} readOnly showRoundStatus />
    {postponedPlayers.length > 0 && <p className="rounded-[14px] border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm leading-snug text-warning">{postponedPlayers.map((player) => player.name).join(", ")} {postponedPlayers.length === 1 ? "está" : "estão"} em jogo adiado e não {postponedPlayers.length === 1 ? "pontua" : "pontuam"} nesta rodada.</p>}
  </section>;
}
