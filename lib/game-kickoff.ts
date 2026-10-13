import type { Jogo } from "@/lib/types";

/** Horário apresentado ao usuário; o original permanece como referência histórica. */
export function displayedKickoff(game: Pick<Jogo, "inicio_em" | "inicio_simulado_em">) {
  return game.inicio_simulado_em ?? game.inicio_em;
}
