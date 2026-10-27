import { FORMATIONS, toCents, type Formation, type Position } from "@/lib/lineup-rules";

export type AutoLineupCandidate = { id: number; name: string; position: Position; price: number; score: number };

export type AutoLineupResult<T extends AutoLineupCandidate> =
  | { ok: true; players: T[]; cost: number }
  | { ok: false; reason: "POSICOES_INSUFICIENTES" | "SALDO_INSUFICIENTE" };

/**
 * Escalação automática: parte do time mais barato da formação e troca, enquanto
 * couber no saldo, o jogador que traz o maior ganho de nota por real gasto
 * (trocas que economizam têm prioridade). Toda a conta de dinheiro é em centavos.
 */
export function pickAutoLineup<T extends AutoLineupCandidate>(candidates: T[], formation: Formation, budget: number): AutoLineupResult<T> {
  const required = FORMATIONS[formation];
  const positions = Object.keys(required) as Position[];
  const budgetCents = toCents(budget);
  const byPosition = positions.reduce<Record<Position, T[]>>((groups, position) => {
    groups[position] = candidates.filter((candidate) => candidate.position === position)
      .sort((first, second) => toCents(first.price) - toCents(second.price) || second.score - first.score || first.name.localeCompare(second.name));
    return groups;
  }, {} as Record<Position, T[]>);
  if (positions.some((position) => byPosition[position].length < required[position])) return { ok: false, reason: "POSICOES_INSUFICIENTES" };

  const selected = positions.flatMap((position) => byPosition[position].slice(0, required[position]));
  let costCents = selected.reduce((total, player) => total + toCents(player.price), 0);
  if (costCents > budgetCents) return { ok: false, reason: "SALDO_INSUFICIENTE" };

  const value = (gain: number, extraCents: number) => (extraCents <= 0 ? gain + budgetCents : gain / extraCents);
  for (;;) {
    let best: { current: T; next: T; gain: number; extraCents: number } | null = null;
    for (const position of positions) {
      for (const current of selected.filter((player) => player.position === position)) {
        for (const next of byPosition[position]) {
          const extraCents = toCents(next.price) - toCents(current.price);
          const gain = next.score - current.score;
          if (gain <= 0 || costCents + extraCents > budgetCents || selected.some((player) => player.id === next.id)) continue;
          if (!best || value(gain, extraCents) > value(best.gain, best.extraCents)) best = { current, next, gain, extraCents };
        }
      }
    }
    if (!best) break;
    selected[selected.findIndex((player) => player.id === best.current.id)] = best.next;
    costCents += best.extraCents;
  }
  return { ok: true, players: selected, cost: costCents / 100 };
}
