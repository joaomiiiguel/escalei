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

/**
 * Dinheiro do jogo em centavos: preços têm casas decimais e somas em ponto
 * flutuante erram por pouco (60,00000000000001 > 60), recusando times válidos.
 */
export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

/** Soma de preços exata em duas casas. */
export function sumPrices(prices: Array<number | string>): number {
  return prices.reduce<number>((total, price) => total + toCents(price), 0) / 100;
}

/** O custo cabe no saldo? Comparação em centavos. */
export function fitsBudget(cost: number | string, budget: number | string): boolean {
  return toCents(cost) <= toCents(budget);
}

/** Saldo que sobra depois de gastar `prices`, em duas casas. */
export function remainingBudget(budget: number | string, prices: Array<number | string>): number {
  return (toCents(budget) - toCents(sumPrices(prices))) / 100;
}

export function lineupCost(players: LineupPlayer[]): number {
  return sumPrices(players.map((player) => player.preco));
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
  if (!fitsBudget(lineupCost(players), balance)) return "A escalação ultrapassa o seu saldo disponível.";
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
