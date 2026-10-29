/**
 * Status do jogador para a rodada aberta (JOA-163, JOA-164). Lesionados e
 * suspensos não podem ser escalados; `fn_salvar_escalacao` também recusa.
 */
export type PlayerAvailability = "PROVAVEL" | "DUVIDA" | "LESIONADO" | "SUSPENSO";

const LABELS: Record<PlayerAvailability, string> = {
  PROVAVEL: "Provável",
  DUVIDA: "Dúvida",
  LESIONADO: "Lesionado",
  SUSPENSO: "Suspenso",
};

export function parseAvailability(value: unknown): PlayerAvailability {
  return value === "DUVIDA" || value === "LESIONADO" || value === "SUSPENSO" ? value : "PROVAVEL";
}

export function isUnavailable(status: PlayerAvailability | undefined): boolean {
  return status === "LESIONADO" || status === "SUSPENSO";
}

/** "Lesionado · Lesão muscular", "Dúvida", ou `null` para Provável. */
export function availabilityText(status: PlayerAvailability | undefined, reason?: string | null): string | null {
  if (!status || status === "PROVAVEL") return null;
  return reason ? `${LABELS[status]} · ${reason}` : LABELS[status];
}

export function availabilityLabel(status: PlayerAvailability): string {
  return LABELS[status];
}
