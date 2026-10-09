import { CalendarDays, Check, Clock3, LockKeyhole, Pencil, Trophy } from "lucide-react";
import Link from "next/link";
import { LineupFormation, type LineupPlayer } from "./lineup-formation";
import { Badge } from "./badge";

type Formation = "4-3-3" | "4-4-2" | "3-5-2";
function currency(value: number) {
  return `C$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SavedLineup({ formation, players, travaEm }: { formation: Formation; players: LineupPlayer[]; travaEm: string }) {
  const spent = players.reduce((total, player) => total + player.price, 0);
  const lockDate = new Intl.DateTimeFormat("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(travaEm));

  return <section className="flex min-h-0 flex-1 flex-col gap-4" aria-label="Time salvo">
    <div className="flex flex-row py-4 justify-center items-center gap-4">
      <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_0_0_12px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]"><Check className="size-7" /></span>
      <h1 className="text-2xl font-extrabold text-foreground">Time salvo!</h1>
    </div>
    <div className="flex items-center gap-3 rounded-xl bg-primary/15 px-4 py-3 text-primary">
      <LockKeyhole className="size-5 shrink-0" />
      <div><p className="text-sm font-extrabold">Você pode alterar até {lockDate}</p><p className="text-[11px] text-primary/75">A escalação trava no apito inicial do primeiro jogo.</p></div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl bg-card p-3"><b className="block text-base">{formation}</b><span className="text-[10px] text-muted-foreground">formação</span></div>
      <div className="rounded-xl bg-card p-3"><b className="block text-base">{currency(spent)}</b><span className="text-[10px] text-muted-foreground">gastos</span></div>
      <div className="rounded-xl bg-card p-3"><b className="block text-base">{currency(100 - spent)}</b><span className="text-[10px] text-muted-foreground">sobrando</span></div>
    </div>
    <LineupFormation className="min-h-[47vh]" formation={formation} initialPlayers={players} readOnly />
    <div className="grid grid-cols-2 gap-2">
      <Link href="/#jogos-da-rodada" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground"><CalendarDays className="size-4" />Jogos da rodada</Link>
      <Link href="/escalar?editar=1" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold !text-secondary"><Pencil className="size-4" />Editar time</Link>
    </div>
  </section>;
}

type RoundLineupProps = {
  formation: Formation;
  players: LineupPlayer[];
  roundNumber: number;
  status: "EM_ANDAMENTO" | "FECHADA" | "AGENDADA";
  finishedAt?: string | null;
};

function points(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function RoundLineup({ formation, players, roundNumber, status, finishedAt }: RoundLineupProps) {
  const isClosed = status === "FECHADA";
  const totalPoints = players.reduce((total, player) => total + (player.roundPoints ?? 0), 0);
  const finishedPlayers = players.filter((player) => player.roundStatus === "ENCERRADO");
  const livePlayers = players.filter((player) => player.roundStatus === "EM_ANDAMENTO");
  const scheduledPlayers = players.filter((player) => player.roundStatus === "A_JOGAR");
  const postponedPlayers = players.filter((player) => player.roundStatus === "ADIADO");
  const topPlayer = [...players].filter((player) => player.roundStatus === "ENCERRADO").sort((first, second) => (second.roundPoints ?? 0) - (first.roundPoints ?? 0))[0];
  const nextPlayer = livePlayers[0] ?? scheduledPlayers[0];
  const nextText = nextPlayer
    ? `${nextPlayer.roundStatus === "EM_ANDAMENTO" ? "Em campo" : "Próximo jogo"}: ${nextPlayer.name}${nextPlayer.roundLabel ? ` · ${nextPlayer.roundLabel}` : ""}`
    : null;
  const finishedDate = finishedAt
    ? new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(finishedAt))
    : null;

  return <section className="flex min-h-0 flex-1 flex-col gap-3.5 pb-28" aria-label="Meu time na rodada">
    <header className="flex h-12 items-center justify-between"><h1 className="text-2xl font-extrabold tracking-[-0.5px] text-foreground">Meu time</h1></header>
    <section className="rounded-2xl bg-card p-4" aria-label="Placar da rodada">
      <div className="flex items-start justify-between gap-3">
        <div className="">
          <p className="text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground">{isClosed ? "PONTUAÇÃO OFICIAL" : "PONTOS PARCIAIS"} DA RODADA {String(roundNumber).padStart(2, "0")}</p>
          <p className="mt-1 font-mono text-[40px] font-black leading-none tracking-[-1.5px] text-foreground">{points(totalPoints)}<span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">pts</span></p>
        </div>
        <Badge className="h-6 !px-3" tone={isClosed ? "highlight" : "primary"}>{isClosed ? "Fechada" : "Em andamento"}</Badge>

      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-card-foreground px-3 py-2.5"><b className="block text-[18px] font-extrabold leading-tight text-foreground">{finishedPlayers.length}/11</b><span className="text-[11px] text-muted-foreground">já pontuaram</span></div>
        <div className="rounded-xl bg-card-foreground px-3 py-2.5"><b className="block text-[18px] font-extrabold leading-tight text-foreground">{livePlayers.length}</b><span className="text-[11px] text-muted-foreground">em campo</span></div>
        <div className="rounded-xl bg-card-foreground px-3 py-2.5"><b className="block truncate text-[18px] font-extrabold leading-tight text-foreground">{isClosed && topPlayer ? points(topPlayer.roundPoints ?? 0) : scheduledPlayers.length}</b><span className="block truncate text-[11px] text-muted-foreground">{isClosed && topPlayer ? `craque: ${topPlayer.name}` : "a jogar"}</span></div>
      </div>
      {isClosed ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-card-foreground px-3 py-2.5 text-xs font-semibold leading-4 text-muted-foreground"><Trophy className="size-[15px] shrink-0" aria-hidden="true" />Pontuação oficial{finishedDate ? ` fechada em ${finishedDate}.` : " confirmada."}</div> : nextText ? <div className="mt-3 flex items-center gap-2 rounded-xl bg-card-foreground px-3 py-2.5 text-xs font-semibold leading-4 text-muted-foreground"><Clock3 className="size-[15px] shrink-0" aria-hidden="true" />{nextText}</div> : null}
    </section>
    <LineupFormation className="h-[50vh] flex-none" formation={formation} initialPlayers={players} readOnly showRoundStatus />
    {postponedPlayers.length > 0 && <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-5 text-warning">{postponedPlayers.map((player) => player.name).join(", ")} {postponedPlayers.length === 1 ? "está" : "estão"} em jogo adiado e não pontua nesta rodada.</p>}
  </section>;
}
