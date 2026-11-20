import { displayedKickoff } from "@/lib/game-kickoff";
import type { Jogo } from "@/lib/types";

/** Jogo da rodada com o nome dos dois clubes já resolvido. */
export type MatchWithClubs = Pick<Jogo, "clube_casa_id" | "clube_fora_id" | "inicio_em" | "inicio_simulado_em" | "status"> & {
  nome_casa: string | null;
  nome_fora: string | null;
};

/** Jogos que não entram mais na conta de "próximo jogo". */
const IGNORED_STATUS: ReadonlySet<Jogo["status"]> = new Set(["ENCERRADO", "CANCELADO"]);

/**
 * Adversário de cada clube no próximo jogo entre os informados (os da rodada
 * atual). Ignora jogos encerrados ou cancelados e, havendo mais de um, fica com
 * o que começa primeiro. Clube sem jogo não aparece no mapa.
 */
export function nextOpponentByClub(games: MatchWithClubs[]): Map<number, string> {
  const upcoming = games
    .filter((game) => !IGNORED_STATUS.has(game.status) && game.nome_casa && game.nome_fora)
    .sort((first, second) => new Date(displayedKickoff(first)).getTime() - new Date(displayedKickoff(second)).getTime());

  const opponents = new Map<number, string>();
  for (const game of upcoming) {
    if (!opponents.has(game.clube_casa_id)) opponents.set(game.clube_casa_id, game.nome_fora!);
    if (!opponents.has(game.clube_fora_id)) opponents.set(game.clube_fora_id, game.nome_casa!);
  }
  return opponents;
}
