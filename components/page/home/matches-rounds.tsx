import { TeamLogo } from "@/components/ui/team-logo";
import { formatKickoffTime } from "@/lib/formatDate";
import { displayedKickoff } from "@/lib/game-kickoff";
import { groupGamesByDay } from "@/lib/round-home";
import type { Clube, Jogo } from "@/lib/types";
import { quietPanel, scoreboard } from "@/components/ui/scoreboard";

const finishedLabel: Partial<Record<Jogo["status"], string>> = { ENCERRADO: "Fim", ADIADO: "Adiado", CANCELADO: "Cancelado" };

/** Grade de jogos da rodada, agrupada por dia, como uma tabela de transmissão. */
const MatchesRounds = ({ games, clubsById }: { games: Jogo[]; clubsById: Map<number, Clube> }) => {
    const days = groupGamesByDay(games);

    return (
        <section aria-labelledby="jogos-da-rodada" className={`${quietPanel} px-4 pb-2 pt-4`}>
            <div className="flex items-baseline justify-between">
                <h2 id="jogos-da-rodada" className={`${scoreboard} text-[26px] uppercase leading-none`}>Jogos da rodada</h2>
                {games.length > 0 && <span className="text-sm text-giz/60">{games.length} {games.length === 1 ? "jogo" : "jogos"}</span>}
            </div>
            {days.length === 0
                ? <p className="py-4 text-[15px] text-giz/70">Os jogos desta rodada ainda não foram publicados.</p>
                : days.map((day) => <div key={day.key} className="mt-4">
                    <h3 className="text-sm font-bold text-giz/60">{day.label}</h3>
                    <ul className="divide-y divide-border/70">
                        {day.games.map((game) => <MatchRow key={game.id} game={game} home={clubsById.get(game.clube_casa_id)} away={clubsById.get(game.clube_fora_id)} />)}
                    </ul>
                </div>)}
        </section>
    );
};

function MatchRow({ game, home, away }: { game: Jogo; home?: Clube; away?: Clube }) {
    const hasScore = game.status === "ENCERRADO" || game.status === "EM_ANDAMENTO";
    const homeGoals = game.gols_casa ?? 0;
    const awayGoals = game.gols_fora ?? 0;
    const finished = game.status === "ENCERRADO";
    const homeName = home?.nome ?? "Clube não disponível";
    const awayName = away?.nome ?? "Clube não disponível";

    return (
        <li className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-3" aria-label={`${homeName} contra ${awayName}`}>
            <div className="row-span-2">
                {game.status === "A_JOGAR" && <time dateTime={displayedKickoff(game)} className={`${scoreboard} text-[26px] leading-none`}>{formatKickoffTime(displayedKickoff(game))}</time>}
                {game.status === "EM_ANDAMENTO" && <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-warning">
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-warning motion-safe:animate-pulse" />Ao vivo
                </span>}
                {finishedLabel[game.status] && <span className="text-[13px] font-bold text-giz/55">{finishedLabel[game.status]}</span>}
            </div>
            <TeamLine club={home} name={homeName} dimmed={finished && homeGoals < awayGoals} />
            <Goals value={hasScore ? homeGoals : null} dimmed={finished && homeGoals < awayGoals} />
            <TeamLine club={away} name={awayName} dimmed={finished && awayGoals < homeGoals} />
            <Goals value={hasScore ? awayGoals : null} dimmed={finished && awayGoals < homeGoals} />
        </li>
    );
}

function TeamLine({ club, name, dimmed }: { club?: Clube; name: string; dimmed: boolean }) {
    return <p className={`flex min-w-0 items-center gap-2.5 text-[15px] font-semibold ${dimmed ? "text-giz/55" : ""}`}>
        <TeamLogo className="size-5 shrink-0" logoUrl={club?.logo_url} nome={name} sigla={club?.sigla ?? "—"} />
        <span className="truncate">{name}</span>
    </p>;
}

function Goals({ value, dimmed }: { value: number | null; dimmed: boolean }) {
    return <span className={`${scoreboard} min-w-4 text-right text-[22px] leading-none ${dimmed ? "text-giz/55" : ""}`}>{value ?? ""}</span>;
}

export default MatchesRounds;
