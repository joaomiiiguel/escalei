import formatDateTime, { formatKickoffTime } from "@/lib/formatDate";
import { displayedKickoff } from "@/lib/game-kickoff";
import { Clube, EstatisticaDaRodada, Jogo, Rodada, TimeDaRodada } from "@/lib/types";
import { Clock3, ShieldCheck } from "lucide-react";
import Link from "next/link";

function teamPresentation(hasTeam: boolean, round: Rodada, now: Date) {
    const canEdit = round.status === "ABERTA" && now < new Date(round.trava_em);
    if (!hasTeam && canEdit) return { title: "Você ainda não escalou", description: "Monte sua equipe para disputar esta rodada.", cta: "Montar meu time" };
    if (hasTeam && canEdit) return { title: "Seu time está escalado", description: `Você pode editar até ${formatDateTime(round.trava_em)}.`, cta: "Ver escalação" };
    if (hasTeam && round.status === "EM_ANDAMENTO") return { title: "Seu time está acompanhando a rodada", description: "Os pontos são lançados quando cada jogo termina.", cta: "Ver pontos do meu time" };
    if (hasTeam) return { title: "Seu time está travado", description: "A escalação não pode mais ser alterada nesta rodada.", cta: "Ver meu time" };
    return { title: "Nenhum time escalado nesta rodada", description: "Acompanhe a próxima rodada para montar sua equipe.", cta: null };
}

const RoundViewCTA = ({ team, round, now, games, clubsById, teamStats }: { team: TimeDaRodada | null; round: Rodada | null; now: Date, games: Jogo[], clubsById: Map<number, Clube>, teamStats: EstatisticaDaRodada[] }) => {

    const presentation = teamPresentation(Boolean(team), round!, now);
    const isUnselected = !team && round?.status === "ABERTA" && now < new Date(round?.trava_em);
    const liveGames = games.filter((game) => game.status === "EM_ANDAMENTO");
    const pendingGames = games.filter((game) => game.status === "A_JOGAR");
    const gamesById = new Map(games.map((game) => [game.id, game]));
    const matchLabel = (game: Jogo) => `${clubsById.get(game.clube_casa_id)?.sigla ?? "—"} × ${clubsById.get(game.clube_fora_id)?.sigla ?? "—"}`;
    const selectedPlayers = team?.times_jogadores?.length ?? 0;
    const completedPlayers = new Set(teamStats.filter((stat) => gamesById.get(stat.jogo_id)?.status === "ENCERRADO").map((stat) => stat.jogador_id)).size;
    const livePlayers = new Set(teamStats.filter((stat) => gamesById.get(stat.jogo_id)?.status === "EM_ANDAMENTO").map((stat) => stat.jogador_id)).size;
    const roundPoints = teamStats.reduce((total, stat) => total + (stat.pontos ?? 0), 0);
    const nextGame = liveGames[0] ?? pendingGames[0] ?? null;
    const nextGameStatus = nextGame?.status === "EM_ANDAMENTO" ? "em andamento" : "próximo";

    return (
        <section className={isUnselected ? "rounded-2xl bg-primary p-3 outline outline-1.5 -outline-offset-1 outline-primary" : "rounded-2xl border border-border bg-secondary/70 p-3"}>
            <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-sm font-extrabold tracking-[0.12em] text-white">MEU TIME</p>
                {team?.formacao && <span className="rounded-lg border border-primary/40 px-3 py-1 text-xs font-extrabold text-foreground">{team.formacao}</span>}
            </div>
            {round?.status === "EM_ANDAMENTO" || round?.status === "FECHADA" ?
                <div className="py-2">
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-primary/20 px-2 py-3 text-center">
                            <p className="text-lg font-extrabold leading-none text-primary">
                                {roundPoints.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white">Pontos finais</p>
                        </div>
                        <div className="rounded-xl bg-primary/20 px-2 py-3 text-center">
                            <p className="text-lg font-extrabold leading-none text-primary">{completedPlayers}/{selectedPlayers || 11}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white">Pontuaram</p>
                        </div>
                        <div className="rounded-xl bg-primary/20 px-2 py-3 text-center">
                            <p className="text-lg font-extrabold leading-none text-primary">{livePlayers}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white">Ao vivo</p>
                        </div>
                    </div>
                    {round?.status === "EM_ANDAMENTO" && <p className="mt-4 flex items-center gap-2 text-xs font-medium text-white">
                        <Clock3 className="size-4 shrink-0 text-primary" aria-hidden="true" />{nextGame ? `${completedPlayers} de ${selectedPlayers || 11} já pontuaram · ${nextGameStatus}: ${matchLabel(nextGame)}` : `${completedPlayers} de ${selectedPlayers || 11} jogadores já pontuaram`}
                    </p>}
                </div>
                : <div className="flex items-center gap-3">
                    <div className={isUnselected ? "grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" : "grid size-11 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary"}>
                        <ShieldCheck className="size-[22px]" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[17px] font-extrabold text-foreground">{presentation.title}</h2>
                        <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">{isUnselected ? "Monte 11 jogadores dentro do seu saldo. Leva uns 3 minutos — ou use a escalação automática." : presentation.description}</p>
                    </div>
                </div>}
            {team && presentation.cta && round?.status !== "EM_ANDAMENTO" && <Link href="/escalar" className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-xl bg-primary/80 px-4 text-sm font-bold text-secondary outline-none transition active:bg-primary focus-visible:ring-2 focus-visible:ring-ring uppercase">{presentation.cta}</Link>}
        </section>)

};

export default RoundViewCTA