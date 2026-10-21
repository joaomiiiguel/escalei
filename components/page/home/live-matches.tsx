import type { Jogo } from "@/lib/types";
import { RefreshCw } from "lucide-react";

const LiveMatches = ({ completedGames, games, liveGames, lastCompletedGame, matchLabel }: { completedGames: number, games: Jogo[], liveGames: Jogo[], lastCompletedGame: Jogo | null, matchLabel: (game: Jogo) => string }) => {
    return (
        <div className="grid gap-2 rounded-2xl bg-secondary/30 border border-secondary p-3">
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-extrabold">{completedGames} de {games.length} jogos encerrados</p>
                <p className="text-xs font-medium text-muted-foreground">{liveGames.length} {liveGames.length === 1 ? "em andamento" : "em andamento"}</p>
            </div>
            <div className="grid grid-flow-col auto-cols-fr gap-1" aria-label={`${completedGames} jogos encerrados e ${liveGames.length} em andamento`}>
                {games.map((game) => <span key={game.id} className={`h-1.5 rounded-full ${game.status === "ENCERRADO" ? "bg-primary" : game.status === "EM_ANDAMENTO" ? "bg-warning animate-pulse" : game.status === "ADIADO" || game.status === "CANCELADO" ? "bg-red-800" : "bg-primary/20"}`} />)}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">{lastCompletedGame ? `Pontuação atualizada após ${matchLabel(lastCompletedGame)}` : "Aguardando o encerramento dos jogos"}</p>
        </div>
    )
}

export default LiveMatches;