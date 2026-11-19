/**
 * Regras do push de fim de jogo de `notify-whatsapp`, separadas do acesso ao
 * banco para serem testadas com Vitest. Este módulo não usa globais do Deno.
 */
export type FinishedGame = {
  id: number;
  homeSigla: string;
  awaySigla: string;
  homeGoals: number | null;
  awayGoals: number | null;
};

/** Jogador escalado pelo usuário em um dos dois clubes do jogo. `points` é `null` quando ele não foi pontuado. */
export type LinedUpPlayer = { name: string; points: number | null };

/** Linha de `times_jogadores` já com o dono do time e o nome do jogador. */
export type LinedUpRow = { usuario_id: string; name: string; points: number | null };

export function formatPoints(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Placar no formato `COR 2 x 1 PAL`; sem gols registrados, só o confronto. */
export function gameScore(game: FinishedGame): string {
  if (game.homeGoals === null || game.awayGoals === null) return `${game.homeSigla} x ${game.awaySigla}`;
  return `${game.homeSigla} ${game.homeGoals} x ${game.awayGoals} ${game.awaySigla}`;
}

function playerLine(player: LinedUpPlayer): string {
  return player.points === null ? `${player.name} não entrou` : `${player.name} ${formatPoints(player.points)} pts`;
}

/** Texto do corpo: os escalados do usuário nesse jogo, do que mais pontuou para o que menos pontuou. */
export function gameEndBody(players: LinedUpPlayer[]): string {
  if (!players.length) return "Você não tinha jogador nesse jogo. Veja como está seu time na rodada.";
  const sorted = [...players].sort((first, second) => (second.points ?? -Infinity) - (first.points ?? -Infinity) || first.name.localeCompare(second.name, "pt-BR"));
  const total = players.reduce((sum, player) => sum + (player.points ?? 0), 0);
  const lines = sorted.map(playerLine).join(", ");
  return players.length === 1
    ? `Seu escalado: ${lines}.`
    : `Seus escalados: ${lines}. Total no jogo: ${formatPoints(total)} pts.`;
}

/** A `tag` faz o aparelho substituir, e não duplicar, um aviso reenviado do mesmo jogo. */
export function gameEndPayload(game: FinishedGame, players: LinedUpPlayer[]): string {
  return JSON.stringify({
    title: `⚽ Fim de jogo! ${gameScore(game)}`,
    body: gameEndBody(players),
    tag: `fim-de-jogo-${game.id}`,
    url: "/escalar",
  });
}

/** Agrupa os escalados por usuário. */
export function playersByUser(rows: LinedUpRow[]): Map<string, LinedUpPlayer[]> {
  const byUser = new Map<string, LinedUpPlayer[]>();
  for (const row of rows) {
    const players = byUser.get(row.usuario_id) ?? [];
    players.push({ name: row.name, points: row.points });
    byUser.set(row.usuario_id, players);
  }
  return byUser;
}
