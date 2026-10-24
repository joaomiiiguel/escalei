/**
 * Conversão dos payloads da API-Football (`/fixtures/players` e
 * `/fixtures/events`) para linhas de `estatisticas_jogador`.
 *
 * - Valores nulos ou ausentes viram 0.
 * - Gols contra vêm dos eventos (`Goal` / `Own Goal`).
 * - Clean sheet (`sem_sofrer_gol`) exige 60 minutos ou mais em campo e o
 *   adversário sem gols; a tabela de pontuação só o premia para GOL e DEF.
 *
 * Este módulo não usa globais do Deno para poder ser testado com Vitest.
 */

export type ApiPlayerStatistic = {
  player: { id: number };
  statistics: Array<{
    games?: { minutes?: number | null; position?: string | null; substitute?: boolean | null; rating?: string | null };
    goals?: { total?: number | null; assists?: number | null; saves?: number | null; conceded?: number | null };
    shots?: { total?: number | null; on?: number | null };
    tackles?: { total?: number | null };
    fouls?: { drawn?: number | null; committed?: number | null };
    offsides?: number | null;
    cards?: { yellow?: number | null; red?: number | null };
    penalty?: { won?: number | null; committed?: number | null; missed?: number | null; saved?: number | null };
  }>;
};

export type ApiPlayerGroup = { team: { id: number }; players: ApiPlayerStatistic[] };
export type ApiEvent = { type?: string; detail?: string; player?: { id?: number | null } };

export type ScoredGame = {
  id: number;
  rodada_id: number;
  clube_casa_id: number;
  clube_fora_id: number;
  gols_casa: number | null;
  gols_fora: number | null;
};

export type BuildScoutsInput = {
  jogo: ScoredGame;
  playerGroups: ApiPlayerGroup[];
  events: ApiEvent[];
  jogadorIdByApiId: Map<number, number>;
  clubeIdByApiId: Map<number, number>;
  conferencia: boolean;
  lidoEm: string;
};

export const numberOrZero = (value: number | null | undefined) => Number.isFinite(value) ? Number(value) : 0;

export const gamePosition = (value: string | null | undefined) => {
  const normalized = value?.toUpperCase();
  return normalized === "G" || normalized === "D" || normalized === "M" || normalized === "F" ? normalized : null;
};

/** Monta as linhas de `estatisticas_jogador`; jogadores fora do catálogo local são ignorados. */
export function buildScouts({ jogo, playerGroups, events, jogadorIdByApiId, clubeIdByApiId, conferencia, lidoEm }: BuildScoutsInput) {
  const ownGoalsByPlayerApiId = new Map<number, number>();
  for (const event of events) {
    if (event.type === "Goal" && event.detail === "Own Goal" && event.player?.id) {
      ownGoalsByPlayerApiId.set(event.player.id, (ownGoalsByPlayerApiId.get(event.player.id) ?? 0) + 1);
    }
  }

  return playerGroups.flatMap((group) => group.players.flatMap((player) => {
    const localPlayerId = jogadorIdByApiId.get(player.player.id);
    const localClubId = clubeIdByApiId.get(group.team.id);
    const stat = player.statistics[0];
    if (!localPlayerId || !localClubId || !stat) return [];
    const minutes = numberOrZero(stat.games?.minutes);
    const isHome = localClubId === jogo.clube_casa_id;
    const opponentGoals = isHome ? numberOrZero(jogo.gols_fora) : numberOrZero(jogo.gols_casa);
    return [{
      jogo_id: jogo.id,
      jogador_id: localPlayerId,
      rodada_id: jogo.rodada_id,
      clube_id: localClubId,
      minutos: minutes,
      posicao_jogo: gamePosition(stat.games?.position),
      substituto: stat.games?.substitute === true,
      nota_api: stat.games?.rating ? Number(stat.games.rating) : null,
      gols: numberOrZero(stat.goals?.total),
      assistencias: numberOrZero(stat.goals?.assists),
      finalizacoes: numberOrZero(stat.shots?.total),
      finalizacoes_no_gol: numberOrZero(stat.shots?.on),
      desarmes: numberOrZero(stat.tackles?.total),
      faltas_sofridas: numberOrZero(stat.fouls?.drawn),
      faltas_cometidas: numberOrZero(stat.fouls?.committed),
      impedimentos: numberOrZero(stat.offsides),
      amarelos: numberOrZero(stat.cards?.yellow),
      vermelhos: numberOrZero(stat.cards?.red),
      defesas: numberOrZero(stat.goals?.saves),
      gols_sofridos: numberOrZero(stat.goals?.conceded),
      penaltis_sofridos: numberOrZero(stat.penalty?.won),
      penaltis_cometidos: numberOrZero(stat.penalty?.committed),
      penaltis_perdidos: numberOrZero(stat.penalty?.missed),
      penaltis_defendidos: numberOrZero(stat.penalty?.saved),
      gols_contra: ownGoalsByPlayerApiId.get(player.player.id) ?? 0,
      sem_sofrer_gol: minutes >= 60 && opponentGoals === 0,
      versao_leitura: conferencia ? 2 : 1,
      payload_api: player,
      lido_em: lidoEm,
    }];
  }));
}
