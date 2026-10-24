import type { StatusRodada } from "@/lib/types";

/**
 * Regras da escalação compartilhadas entre telas, rotas e Server Actions.
 * O banco aplica as mesmas regras em `fn_salvar_escalacao`; aqui elas servem
 * para responder rápido ao usuário antes de chamar o banco.
 */
export const FORMATIONS = {
  "4-3-3": { GOL: 1, DEF: 4, MEI: 3, ATA: 3 },
  "4-4-2": { GOL: 1, DEF: 4, MEI: 4, ATA: 2 },
  "3-5-2": { GOL: 1, DEF: 3, MEI: 5, ATA: 2 },
} as const;

export const LINEUP_SIZE = 11;

export type Formation = keyof typeof FORMATIONS;
export type Position = keyof (typeof FORMATIONS)[Formation];
export type LineupPlayer = { posicao: Position; preco: number | string };
export type PlayerRoundStatus = "A_JOGAR" | "ADIADO" | "EM_ANDAMENTO" | "ENCERRADO" | "SEM_JOGO";

export function isFormation(value: unknown): value is Formation {
  return typeof value === "string" && Object.hasOwn(FORMATIONS, value);
}

export function positionsOf(formation: Formation): Position[] {
  return Object.keys(FORMATIONS[formation]) as Position[];
}

export function lineupCost(players: LineupPlayer[]): number {
  return Math.round(players.reduce((total, player) => total + Number(player.preco), 0) * 100) / 100;
}

/** Ids únicos e válidos, ou `null` quando a lista não forma uma escalação completa. */
export function normalizePlayerIds(ids: unknown): number[] | null {
  if (!Array.isArray(ids)) return null;
  const unique = [...new Set(ids)];
  if (unique.length !== LINEUP_SIZE || unique.some((id) => !Number.isInteger(id) || id <= 0)) return null;
  return unique as number[];
}

/** Valida formação, quantidade, posições e saldo. Devolve a mensagem de erro ou `null`. */
export function validateLineup(formation: string, players: LineupPlayer[], balance: number): string | null {
  if (!isFormation(formation)) return "Formação inválida.";
  if (players.length !== LINEUP_SIZE) return "Selecione os 11 jogadores antes de salvar.";
  const counts = players.reduce<Record<Position, number>>((total, player) => {
    total[player.posicao] += 1;
    return total;
  }, { GOL: 0, DEF: 0, MEI: 0, ATA: 0 });
  if (positionsOf(formation).some((position) => counts[position] !== FORMATIONS[formation][position])) {
    return "Os jogadores não correspondem à formação escolhida.";
  }
  if (lineupCost(players) > balance) return "A escalação ultrapassa o seu saldo disponível.";
  return null;
}

/** Uma rodada aceita escalações apenas enquanto está ABERTA e antes da trava. */
export function isRoundEditable(round: { status: StatusRodada; trava_em: string } | null | undefined, now = new Date()): boolean {
  return round?.status === "ABERTA" && now.getTime() < new Date(round.trava_em).getTime();
}

/** Situação do jogo de um escalado na rodada, a partir do status do jogo. */
export function playerRoundStatus(gameStatus: string | null | undefined): PlayerRoundStatus {
  if (gameStatus === "ENCERRADO" || gameStatus === "EM_ANDAMENTO" || gameStatus === "A_JOGAR") return gameStatus;
  if (gameStatus === "ADIADO" || gameStatus === "CANCELADO") return "ADIADO";
  return "SEM_JOGO";
}
