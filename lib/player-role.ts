/**
 * Titular ou reserva no último jogo encerrado do clube (JOA-170). É o que
 * aconteceu nesse jogo, não uma previsão para a próxima rodada.
 */
export type PlayerRole = "TITULAR" | "RESERVA";

const LABELS: Record<PlayerRole, string> = {
  TITULAR: "Titular no último jogo",
  RESERVA: "Reserva no último jogo",
};

/** Jogador sem leitura confiável do último jogo do clube. */
export const NO_ROLE_LABEL = "Sem dados do último jogo";

/** Janela de jogos encerrados: cobre um clube com jogos adiados nas últimas rodadas. */
export const LAST_GAMES_WINDOW = 40;

type FinishedGame = { id: number; clube_casa_id: number; clube_fora_id: number };
type GameStat = { jogo_id: number; jogador_id: number; clube_id: number; substituto: boolean };

export function playerRoleLabel(role: PlayerRole | null | undefined): string {
  return role ? LABELS[role] : NO_ROLE_LABEL;
}


/** Ordem no mercado: titulares, reservas, sem dados e, por último, quem não pode ser escalado. */
export function marketRank(role: PlayerRole | null | undefined, unavailable: boolean): number {
  if (unavailable) return 3;
  return role === "TITULAR" ? 0 : role === "RESERVA" ? 1 : 2;
}

/** Último jogo de cada clube; `games` vem do mais recente para o mais antigo. */
export function lastGameByClub(games: FinishedGame[]): Map<number, number> {
  const lastGames = new Map<number, number>();
  for (const game of games) {
    for (const clubId of [game.clube_casa_id, game.clube_fora_id]) {
      if (!lastGames.has(clubId)) lastGames.set(clubId, game.id);
    }
  }
  return lastGames;
}

/**
 * Papel de cada jogador por clube. Um clube sem titulares ou com mais de 11 no
 * jogo não tem leitura confiável (linhas gravadas com todos como não
 * substitutos, ou sem minutos) e fica sem dados. Menos de 11 é normal: titular
 * fora do catálogo local não é gravado.
 */
export function lastGameRoles(lastGames: Map<number, number>, stats: GameStat[]): Map<number, Map<number, PlayerRole>> {
  const rows = stats.filter((stat) => lastGames.get(stat.clube_id) === stat.jogo_id);
  const roles = new Map<number, Map<number, PlayerRole>>();
  for (const clubId of new Set(rows.map((row) => row.clube_id))) {
    const clubRows = rows.filter((row) => row.clube_id === clubId);
    const starters = clubRows.filter((row) => !row.substituto).length;
    if (starters < 1 || starters > 11) continue;
    roles.set(clubId, new Map(clubRows.map((row) => [row.jogador_id, row.substituto ? "RESERVA" : "TITULAR"])));
  }
  return roles;
}
