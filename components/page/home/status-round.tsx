import { Badge } from "@/components/ui";
import Link from "next/link";
import { CalendarClock, CloudOff, Dot, Info, ShieldCheck } from "lucide-react";
import type { Rodada, Jogo, TimeDaRodada, Clube, StatusRodada } from "@/lib/types";
import { LockCountdown } from "@/app/lock-countdown";
import formatDateTime from "@/lib/formatDate";

const roundStatusLabel: Record<StatusRodada, string> = {
    AGENDADA: "Agendada",
    ABERTA: "Aberta",
    EM_ANDAMENTO: "Em andamento",
    FECHADA: "Fechada",
};

const StatusRodada = ({ unavailable, round, nextRound, now }: {
    unavailable: boolean;
    now: Date;
    nextRound: Pick<Rodada, "numero" | "temporada" | "abre_em"> | null;
    round: Rodada | null
}) => {
    if (unavailable) return (
        <section className="rounded-2xl border border-primary bg-secondary/30 p-5 text-center">
            <CloudOff className="mx-auto size-8 text-[#9aec87]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold">Não foi possível carregar a rodada</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Confira sua conexão e tente novamente.</p>
            <Link className="mt-3 inline-flex text-sm font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href="/">Tentar novamente</Link>
        </section>
    )

    if (!round) return (
        <section className="rounded-2xl border border-primary bg-secondary/30 p-5 text-center">
            <CalendarClock className="mx-auto size-8 text-[#9aec87]" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-bold">Nenhuma rodada disponível</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Quando a próxima rodada for publicada, os jogos e a janela do mercado aparecerão aqui.</p>
        </section>
    )

    return (
        <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Badge className="h-6 !px-4 gap-2" tone={round.status === "ABERTA" || round.status === "EM_ANDAMENTO" ? "primary" : round.status === "AGENDADA" ? "secondary" : "neutral"}><Dot className={`${round.status === "ABERTA" ? "text-primary" : round.status === "EM_ANDAMENTO" ? "text-warning" : round.status === "AGENDADA" ? "text-primary" : "text-white"} rounded-full size-8 -mx-4`} />{roundStatusLabel[round.status]}</Badge>
                <p className="text-[12px]/[normal] box-border text-[#6d7d76] opacity-80 font-bold text-left [white-space:nowrap]">{round.status === "ABERTA" ? "Mercado aberto" : round.status === "EM_ANDAMENTO" ? "Jogos em andamento" : round.status === "AGENDADA" ? "Sem parcial ao vivo" : "Pontuação oficial"}</p>
            </div>

            {round.status === "ABERTA" && now < new Date(round.trava_em) &&
                <LockCountdown travaEm={round.trava_em} formattedDate={formatDateTime(round.trava_em)} />
            }
        </section>
    )
}
export default StatusRodada