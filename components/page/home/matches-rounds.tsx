import { Jogo, Clube } from "@/lib/types";
import { ScoreCard } from "@/components/ui";
import { displayedKickoff } from "@/lib/game-kickoff";

const MatchesRounds = ({ games, clubsById }: { games: Jogo[]; clubsById: Map<number, Clube> }) => {
    return (
        <section aria-labelledby="jogos-da-rodada">
            <div className="mb-3 flex items-center justify-between">
                <h2 id="jogos-da-rodada" className="text-lg font-bold">Jogos da rodada</h2>
                <span className="text-xs font-semibold text-muted-foreground">
                    {games.length} {games.length === 1 ? "jogo" : "jogos"}
                </span>
            </div>
            {games.length === 0 ?
                <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">Os jogos desta rodada ainda não foram publicados.</div>
                : <div className="grid gap-2">
                    {games.map((game) => {
                        const home = clubsById.get(game.clube_casa_id);
                        const away = clubsById.get(game.clube_fora_id);
                        return <ScoreCard key={game.id} home={{ nome: home?.nome ?? "Clube não disponível", sigla: home?.sigla ?? "—", logoUrl: home?.logo_url }} away={{ nome: away?.nome ?? "Clube não disponível", sigla: away?.sigla ?? "—", logoUrl: away?.logo_url }} homeGoals={game.gols_casa} awayGoals={game.gols_fora} kickoff={displayedKickoff(game)} status={game.status} />;
                    })}
                </div>
            }
        </section>
    );
};

export default MatchesRounds;