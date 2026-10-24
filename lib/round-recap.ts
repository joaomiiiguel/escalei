export type RecapStat = { jogador_id: number; pontos: number | string | null };
export type RecapRankingRow = { usuario_id: string; posicao: number };

export type RoundRecap = {
  roundNumber: number;
  points: number;
  overallPosition: number | null;
  overallTotal: number;
  groupName: string | null;
  groupPosition: number | null;
  groupSize: number;
  bestPlayer: { name: string; points: number } | null;
};

export function formatRecapPoints(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Soma dos pontos dos escalados na rodada. */
export function recapPoints(stats: RecapStat[]) {
  return Math.round(stats.reduce((total, stat) => total + Number(stat.pontos ?? 0), 0) * 100) / 100;
}

/** Escalado com mais pontos; em empate, o primeiro da lista. */
export function bestPlayer(stats: RecapStat[], namesById: Map<number, string>) {
  const best = stats.reduce<RecapStat | null>((current, stat) => current === null || Number(stat.pontos ?? 0) > Number(current.pontos ?? 0) ? stat : current, null);
  if (!best) return null;
  return { name: namesById.get(best.jogador_id) ?? "Jogador", points: Number(best.pontos ?? 0) };
}

/**
 * Posição do usuário entre os membros do grupo, a partir das posições gerais
 * de `ranking_rodada` (que já aplicam o desempate oficial). Empates dividem a posição.
 */
export function groupPosition(rows: RecapRankingRow[], memberIds: string[], userId: string) {
  const members = new Set(memberIds);
  const groupRows = rows.filter((row) => members.has(row.usuario_id));
  const own = groupRows.find((row) => row.usuario_id === userId);
  if (!own) return null;
  return 1 + groupRows.filter((row) => row.posicao < own.posicao).length;
}

/** Texto do cartão compartilhável, sem linguagem de aposta ou prêmio. */
export function recapShareText(recap: RoundRecap) {
  const parts = [`Fechei a Rodada ${String(recap.roundNumber).padStart(2, "0")} do Escalou com ${formatRecapPoints(recap.points)} pts`];
  if (recap.groupPosition && recap.groupName) parts.push(`— ${recap.groupPosition}º de ${recap.groupSize} no grupo ${recap.groupName}`);
  let text = `${parts.join(" ")}.`;
  if (recap.bestPlayer) text += ` Craque do meu time: ${recap.bestPlayer.name} (${formatRecapPoints(recap.bestPlayer.points)} pts).`;
  return `${text} Monte seu time e venha disputar com a gente!`;
}
