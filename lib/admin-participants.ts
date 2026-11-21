/** Lote de passes como vem de `passes_lotes`, só com o que a contagem usa. */
export type PassBatch = { usuario_id: string; restantes: number; valido_ate_temporada: number };

/**
 * Passes disponíveis por usuário, com a mesma regra de `fn_passes_disponiveis`:
 * soma `restantes` dos lotes válidos para a temporada atual ou posterior.
 */
export function availablePassesByUser(batches: readonly PassBatch[], currentSeason: number): Map<string, number> {
  const totals = new Map<string, number>();
  for (const batch of batches) {
    if (batch.valido_ate_temporada < currentSeason || batch.restantes <= 0) continue;
    totals.set(batch.usuario_id, (totals.get(batch.usuario_id) ?? 0) + batch.restantes);
  }
  return totals;
}
