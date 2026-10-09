import Link from "next/link";
import { Clock3, RefreshCw } from "lucide-react";
import { Badge, ScoreCard } from "@/components/ui";
import type { Rodada, Jogo, TimeDaRodada, EstatisticaDaRodada, Clube } from "@/lib/types";

const saoPaulo = "America/Sao_Paulo";

function formatKickoffTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: saoPaulo, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function ActiveRoundView({
  round,
  games,
  team,
  teamStats,
  clubsById,
}: {
  round: Rodada;
  games: Jogo[];
  team: TimeDaRodada | null;
  teamStats: EstatisticaDaRodada[];
  clubsById: Map<number, Clube>;
}) {
  const completedGames = games.filter((game) => game.status === "ENCERRADO");
  const liveGames = games.filter((game) => game.status === "EM_ANDAMENTO");
  const pendingGames = games.filter((game) => game.status === "A_JOGAR");
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const selectedPlayers = team?.times_jogadores?.length ?? 0;
  const completedPlayers = new Set(teamStats.filter((stat) => gamesById.get(stat.jogo_id)?.status === "ENCERRADO").map((stat) => stat.jogador_id)).size;
  const livePlayers = new Set(teamStats.filter((stat) => gamesById.get(stat.jogo_id)?.status === "EM_ANDAMENTO").map((stat) => stat.jogador_id)).size;
  const roundPoints = teamStats.reduce((total, stat) => total + (stat.pontos ?? 0), 0);
  const nextGame = liveGames[0] ?? pendingGames[0] ?? null;
  const lastCompletedGame = completedGames.at(-1) ?? null;
  const matchLabel = (game: Jogo) => `${clubsById.get(game.clube_casa_id)?.sigla ?? "—"} × ${clubsById.get(game.clube_fora_id)?.sigla ?? "—"}`;
  const nextGameStatus = nextGame?.status === "EM_ANDAMENTO" ? "em andamento" : "próximo";

  return <main className="flex max-w-lg flex-col gap-5 pt-1 pb-44 px-5 text-foreground">
    <header className="flex h-12 items-center">
      <p className="text-2xl font-black tracking-[-0.06em] text-foreground"><span className="mr-1 text-primary">◉</span>escalei</p>
    </header>

    <section className="grid gap-3" aria-labelledby="rodada-atual">
      <div className="flex items-center gap-2">
        <Badge className="h-6 !px-3" tone="primary">Em andamento</Badge>
        <p className="text-xs text-muted-foreground/50">sem parcial ao vivo</p>
      </div>
      <h1 id="rodada-atual" className="text-2xl font-extrabold tracking-tight">Rodada {String(round.numero).padStart(2, "0")} · Brasileirão</h1>
      <div className="grid gap-2 rounded-2xl bg-card p-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-extrabold">{completedGames.length} de {games.length} jogos encerrados</p>
          <p className="text-xs font-medium text-muted-foreground">{liveGames.length} {liveGames.length === 1 ? "em andamento" : "em andamento"}</p>
        </div>
        <div className="grid grid-flow-col auto-cols-fr gap-1" aria-label={`${completedGames.length} jogos encerrados e ${liveGames.length} em andamento`}>
          {games.map((game) => <span key={game.id} className={`h-1.5 rounded-full ${game.status === "ENCERRADO" ? "bg-primary" : game.status === "EM_ANDAMENTO" ? "bg-warning" : "bg-card-foreground"}`} />)}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw className="size-3" aria-hidden="true" />{lastCompletedGame ? `Pontuação atualizada após ${matchLabel(lastCompletedGame)}` : "Aguardando o encerramento dos jogos"}</p>
      </div>
    </section>

    <section className="grid gap-3.5 rounded-2xl bg-card p-4" aria-labelledby="meu-time">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold tracking-[0.12em] text-muted-foreground">MEU TIME</p>
          <h2 id="meu-time" className="mt-0.5 text-base font-extrabold">Seu time</h2>
        </div>
        {team?.formacao && <span className="rounded-lg bg-card-foreground px-2.5 py-1 text-xs font-extrabold text-foreground">{team.formacao}</span>}
      </div>

      {team ? <>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card-foreground px-2 py-3 text-center"><p className="text-lg font-extrabold leading-none">{roundPoints.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pontos</p></div>
          <div className="rounded-xl bg-card-foreground px-2 py-3 text-center"><p className="text-lg font-extrabold leading-none">{completedPlayers}/{selectedPlayers || 11}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pontuaram</p></div>
          <div className="rounded-xl bg-card-foreground px-2 py-3 text-center"><p className="text-lg font-extrabold leading-none">{livePlayers}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Ao vivo</p></div>
        </div>
        <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Clock3 className="size-4 shrink-0 text-warning" aria-hidden="true" />{nextGame ? `${completedPlayers} de ${selectedPlayers || 11} já pontuaram · ${nextGameStatus}: ${matchLabel(nextGame)}, ${formatKickoffTime(nextGame.inicio_em)}` : `${completedPlayers} de ${selectedPlayers || 11} jogadores já pontuaram`}</p>
        <Link href="/escalar" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-card-foreground px-4 text-sm font-bold text-primary transition hover:bg-card-foreground/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">Ver escalação</Link>
      </> : <div className="rounded-xl bg-card-foreground p-3 text-sm leading-6 text-muted-foreground">Você não escalou um time para acompanhar esta rodada.</div>}
    </section>

    <section id="jogos-da-rodada" aria-labelledby="proximos-jogos">
      <div className="mb-3 flex items-center justify-between"><h2 id="proximos-jogos" className="text-lg font-extrabold">Próximos jogos</h2><Link href="#jogos-da-rodada" className="text-sm font-bold text-primary underline-offset-4 hover:underline">Ver todos ({games.length})</Link></div>
      {games.length === 0 ? <div className="rounded-2xl bg-card p-4 text-sm leading-6 text-muted-foreground">Os jogos desta rodada ainda não foram publicados.</div> : <div className="grid gap-2">{games.map((game) => {
        const home = clubsById.get(game.clube_casa_id);
        const away = clubsById.get(game.clube_fora_id);
        return <ScoreCard key={game.id} home={{ nome: home?.nome ?? "Clube não disponível", sigla: home?.sigla ?? "—", logoUrl: home?.logo_url }} away={{ nome: away?.nome ?? "Clube não disponível", sigla: away?.sigla ?? "—", logoUrl: away?.logo_url }} homeGoals={game.gols_casa} awayGoals={game.gols_fora} kickoff={game.inicio_em} status={game.status} />;
      })}</div>}
    </section>
  </main>;
}
