import Link from "next/link";
import { CalendarClock, ShieldCheck } from "lucide-react";
import { Badge, ScoreCard } from "@/components/ui";
import TitleSection from "@/components/ui/title-section";
import { LockCountdown } from "@/app/lock-countdown";
import type { Rodada, Jogo, TimeDaRodada, Clube, StatusRodada } from "@/lib/types";

const saoPaulo = "America/Sao_Paulo";

const roundStatusLabel: Record<StatusRodada, string> = {
  AGENDADA: "Agendada",
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
  FECHADA: "Fechada",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: saoPaulo, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function teamPresentation(hasTeam: boolean, round: Rodada, now: Date) {
  const canEdit = round.status === "ABERTA" && now < new Date(round.trava_em);
  if (!hasTeam && canEdit) return { title: "Você ainda não escalou", description: "Monte sua equipe para disputar esta rodada.", cta: "Montar meu time" };
  if (hasTeam && canEdit) return { title: "Seu time está escalado", description: `Você pode editar até ${formatDateTime(round.trava_em)}.`, cta: "Ver escalação" };
  if (hasTeam && round.status === "EM_ANDAMENTO") return { title: "Seu time está acompanhando a rodada", description: "Os pontos são lançados quando cada jogo termina.", cta: "Ver meu time" };
  if (hasTeam) return { title: "Seu time está travado", description: "A escalação não pode mais ser alterada nesta rodada.", cta: "Ver meu time" };
  return { title: "Nenhum time escalado nesta rodada", description: "Acompanhe a próxima rodada para montar sua equipe.", cta: null };
}

export function DefaultRoundView({
  profile,
  round,
  unavailable,
  roundDataUnavailable,
  now,
  team,
  games,
  clubsById,
}: {
  profile: { apelido: string | null };
  round: Rodada | null;
  unavailable: boolean;
  roundDataUnavailable: boolean;
  now: Date;
  team: TimeDaRodada | null;
  games: Jogo[];
  clubsById: Map<number, Clube>;
}) {
  return <main className="flex max-w-lg flex-col justify-start gap-6 pt-5 pb-44 text-white">
    <header className="flex flex-col items-start justify-between">
      <p className="text-sm text-muted-foreground">Olá, {profile.apelido} 👋</p>
      <TitleSection title={round ? `Rodada ${String(round.numero).padStart(2, "0")} - Brasileirão 2026` : "Início - Brasileirão 2026"} />
    </header>
    {unavailable ?
      <section className="rounded-2xl border border-amber-400/40 bg-amber-950/20 p-4" role="alert">
        <h2 className="font-bold">Não foi possível carregar a rodada</h2>
        <p className="mt-1 text-sm text-[#c7b98f]">Confira sua conexão e tente novamente.</p>
        <Link className="mt-3 inline-flex text-sm font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href="/">Tentar novamente</Link>
      </section>
      : !round ?
        <section className="rounded-2xl border border-border bg-card p-5 text-center">
          <CalendarClock className="mx-auto size-8 text-[#9aec87]" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-bold">Nenhuma rodada disponível</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Quando a próxima rodada for publicada, os jogos e a janela do mercado aparecerão aqui.</p>
        </section>
        :
        <>
          <div className="flex items-center gap-2">
            <Badge className="h-6 !px-4" tone={round.status === "ABERTA" ? "primary" : round.status === "EM_ANDAMENTO" ? "highlight" : round.status === "AGENDADA" ? "secondary" : "neutral"}>{roundStatusLabel[round.status]}</Badge>
            <p className="text-[12px]/[normal] box-border text-[#6d7d76] opacity-80 font-bold text-left [white-space:nowrap]">{round.status === "ABERTA" ? "mercado aberto" : round.status === "EM_ANDAMENTO" ? "jogos em andamento" : round.status === "AGENDADA" ? "sem parcial ao vivo" : "pontuação oficial"}</p>
          </div>

          {round.status === "ABERTA" && now < new Date(round.trava_em) && <LockCountdown travaEm={round.trava_em} formattedDate={formatDateTime(round.trava_em)} />}

          {roundDataUnavailable ?
            <section className="rounded-2xl border border-amber-400/40 bg-amber-950/20 p-4" role="alert">
              <h2 className="font-bold">Alguns dados da rodada estão indisponíveis</h2>
              <p className="mt-1 text-sm text-[#c7b98f]">Tente atualizar a página em instantes.</p>
            </section>
            :
            (() => {
              const presentation = teamPresentation(Boolean(team), round, now);
              const isUnselected = !team && round.status === "ABERTA" && now < new Date(round.trava_em);
              return <section className={isUnselected ? "rounded-2xl bg-primary/12 p-4 outline outline-1.5 -outline-offset-1 outline-primary" : "rounded-2xl border border-border bg-card p-4"}>
                <div className="flex items-center gap-3">
                  <div className={isUnselected ? "grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" : "grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"}><ShieldCheck className="size-[22px]" aria-hidden="true" /></div>
                  <div className="min-w-0">
                    <h2 className="text-[17px] font-extrabold text-foreground">{presentation.title}</h2>
                    <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">{isUnselected ? "Monte 11 jogadores com C$ 100. Leva uns 3 minutos — ou use a escalação automática." : presentation.description}</p>
                  </div>
                </div>
                {team && presentation.cta && <Link href="/escalar" className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-secondary px-4 text-sm font-bold text-primary outline-none transition hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring">{presentation.cta}</Link>}
              </section>
            })()}
          <section aria-labelledby="jogos-da-rodada">
            <div className="mb-3 flex items-center justify-between"><h2 id="jogos-da-rodada" className="text-lg font-bold">Jogos da rodada</h2><span className="text-xs font-semibold text-muted-foreground">{games.length} {games.length === 1 ? "jogo" : "jogos"}</span></div>
            {roundDataUnavailable ? null : games.length === 0 ? <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">Os jogos desta rodada ainda não foram publicados.</div> : <div className="grid gap-2">{games.map((game) => {
              const home = clubsById.get(game.clube_casa_id);
              const away = clubsById.get(game.clube_fora_id);
              return <ScoreCard key={game.id} home={{ nome: home?.nome ?? "Clube não disponível", sigla: home?.sigla ?? "—", logoUrl: home?.logo_url }} away={{ nome: away?.nome ?? "Clube não disponível", sigla: away?.sigla ?? "—", logoUrl: away?.logo_url }} homeGoals={game.gols_casa} awayGoals={game.gols_fora} kickoff={game.inicio_em} status={game.status} />;
            })}</div>}
          </section>
        </>}
  </main>
}
