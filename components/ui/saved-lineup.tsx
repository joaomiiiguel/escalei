import { CalendarDays, Check, Clock3, LockKeyhole, Pencil, Trophy } from "lucide-react";
import Link from "next/link";
import { LineupFormation, type LineupPlayer } from "./lineup-formation";
import { Badge } from "./badge";

type Formation = "4-3-3" | "4-4-2" | "3-5-2";
function currency(value: number) {
  return `C$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SavedLineup({ budget, formation, players, travaEm }: { budget: number; formation: Formation; players: LineupPlayer[]; travaEm: string }) {
  const spent = players.reduce((total, player) => total + player.price, 0);
  const lockDate = new Intl.DateTimeFormat("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(travaEm));

  return <section className="flex min-h-0 flex-1 flex-col gap-4 pb-28" aria-label="Time salvo">
    <div className="grid grid-cols-3 gap-2">
      <div className="rounded-xl bg-primary/30 p-3"><b className="block font-mono text-base text-primary">{formation}</b><span className="text-xs tracking-wide font-bold font-mono text-white">formação</span></div>
      <div className="rounded-xl bg-primary/30 p-3"><b className="block font-mono text-base text-primary">{currency(spent)}</b><span className="text-xs font-bold font-mono text-white">gastos</span></div>
      <div className="rounded-xl bg-primary/30 p-3"><b className="block font-mono text-base text-primary">{currency(budget - spent)}</b><span className="text-xs font-bold font-mono text-white">sobrando</span></div>
    </div>
    <LineupFormation className="min-h-[47vh]" formation={formation} initialPlayers={players} readOnly />
    <div className="flex flex-row justify-center items-center gap-4 bg-primary pb-2 pt-7 rounded-b-xl -mt-10">
      <h1 className="text-xs font-mono font-extrabold text-secondary">Sua escalação está salva!</h1>
    </div>
    <div className="flex items-center gap-3 rounded-xl bg-primary/15 px-4 py-3 text-primary">
      <LockKeyhole className="size-5 shrink-0" />
      <div><p className="text-sm font-extrabold">Você pode alterar até {lockDate}</p><p className="text-[11px] text-primary/75">A escalação trava no apito inicial do primeiro jogo.</p></div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Link href="/#jogos-da-rodada" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground"><CalendarDays className="size-4" />Jogos da rodada</Link>
      <Link href="/escalar?editar=1" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold !text-secondary"><Pencil className="size-4" />Editar time</Link>
    </div>
  </section>;
}


function points(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function RoundLineup({ formation, players, roundNumber, status, finishedAt, lastUpdated }: { formation: Formation; players: LineupPlayer[]; roundNumber: number; status: "EM_ANDAMENTO" | "FECHADA" | "AGENDADA"; finishedAt?: string | null; lastUpdated?: string | null }) {
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
    <section className="rounded-2xl bg-secondary/50 border border-secondary py-4 px-2" aria-label="Placar da rodada">
      <div className="flex flex-col items-start">
        <p className="text-[10px] font-extrabold tracking-[0.1em] text-primary">{isClosed ? "PONTUAÇÃO OFICIAL" : "PONTOS PARCIAIS"} DA RODADA {String(roundNumber).padStart(2, "0")}</p>
        <div className="flex w-full flex-row items-center justify-between py-4">
          <p className="mt-1 font-mono text-[40px] font-black leading-none tracking-[-1.5px] text-foreground">{points(totalPoints)}<span className="ml-1 text-sm font-bold tracking-normal text-muted-foreground">pts</span></p>
          <Badge className="h-6 !px-3" tone={isClosed ? "highlight" : "primary"}>{isClosed ? "Fechada" : "Em andamento"}</Badge>
        </div>

      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary px-3 py-2.5"><b className="block text-[18px] font-extrabold leading-tight text-primary">{finishedPlayers.length}/11</b><span className="text-[11px] font-mono text-white">já pontuaram</span></div>
        <div className="rounded-xl bg-secondary px-3 py-2.5"><b className="block text-[18px] font-extrabold leading-tight text-primary">{livePlayers.length}</b><span className="text-[11px] font-mono text-white">em campo</span></div>
        <div className="rounded-xl bg-secondary px-3 py-2.5"><b className="block truncate text-[18px] font-extrabold leading-tight text-primary">{isClosed && topPlayer ? points(topPlayer.roundPoints ?? 0) : scheduledPlayers.length}</b><span className="block truncate text-[11px] font-mono text-white">{isClosed && topPlayer ? `craque: ${topPlayer.name}` : "a jogar"}</span></div>
      </div>
      {lastUpdated && <p className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1"><Clock3 className="size-3" />Atualizado: {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(lastUpdated))}</p>}
      {isClosed && <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs font-semibold leading-4 text-white"><Trophy className="size-[15px] shrink-0 text-primary" aria-hidden="true" />Pontuação oficial{finishedDate ? ` fechada em ${finishedDate}.` : " confirmada."}</div>}
      {!isClosed && nextText && <div className="mt-3 flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 text-xs font-semibold leading-4 text-white"><Clock3 className="size-[15px] shrink-0 text-primary" aria-hidden="true" />{nextText}</div>}
    </section>
    <LineupFormation className="h-[50vh] flex-none" formation={formation} initialPlayers={players} readOnly showRoundStatus />
    {postponedPlayers.length > 0 && <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2.5 text-xs leading-5 text-warning">{postponedPlayers.map((player) => player.name).join(", ")} {postponedPlayers.length === 1 ? "está" : "estão"} em jogo adiado e não pontua nesta rodada.</p>}
  </section>;
}
