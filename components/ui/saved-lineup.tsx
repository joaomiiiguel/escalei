import { CalendarDays, Check, LockKeyhole, Pencil } from "lucide-react";
import Link from "next/link";
import { LineupFormation, type LineupPlayer } from "./lineup-formation";

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
