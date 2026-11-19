import { displayedKickoff } from "@/lib/game-kickoff";
import type { Jogo } from "@/lib/types";

/** Jogo da rodada com as siglas dos dois clubes já resolvidas. */
export type MatchWithClubs = Pick<Jogo, "clube_casa_id" | "clube_fora_id" | "inicio_em" | "inicio_simulado_em" | "status"> & {
  sigla_casa: string | null;
  sigla_fora: string | null;
};

/** Jogos que não entram mais na conta de "próximo jogo". */
const IGNORED_STATUS: ReadonlySet<Jogo["status"]> = new Set(["ENCERRADO", "CANCELADO"]);

/** Confronto no formato do placar, mandante primeiro (ex.: `CORxPAL`). */
export function matchLabel(homeSigla: string, awaySigla: string): string {
  return `${homeSigla}x${awaySigla}`;
}

/**
 * Próximo jogo de cada clube entre os jogos informados (os da rodada atual).
 * Ignora jogos encerrados ou cancelados e, havendo mais de um, fica com o
 * que começa primeiro. Clube sem jogo não aparece no mapa.
 */
export function nextMatchByClub(games: MatchWithClubs[]): Map<number, string> {
  const upcoming = games
    .filter((game) => !IGNORED_STATUS.has(game.status) && game.sigla_casa && game.sigla_fora)
    .sort((first, second) => new Date(displayedKickoff(first)).getTime() - new Date(displayedKickoff(second)).getTime());

  const matches = new Map<number, string>();
  for (const game of upcoming) {
    const label = matchLabel(game.sigla_casa!, game.sigla_fora!);
    for (const clubId of [game.clube_casa_id, game.clube_fora_id]) {
      if (!matches.has(clubId)) matches.set(clubId, label);
    }
  }
  return matches;
}
