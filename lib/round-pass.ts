/** Situação do passe de rodada do usuário: `required` vem de `fn_passe_exigido` e `available` de `fn_passes_disponiveis`. */
export type PassStatus = { available: number; required: boolean };

export type PassNotice = { text: string; tone: "info" | "warning" };

/** Mesmo texto de `fn_salvar_escalacao` (ES402), para o aviso e o erro ao salvar não divergirem. */
export const PASS_REQUIRED_MESSAGE = "Você precisa de um passe para escalar nesta rodada.";

/** Monta a situação a partir das duas RPCs. Sem uma delas não há o que afirmar, e a tela omite o aviso. */
export function toPassStatus(available: number | null | undefined, required: boolean | null | undefined): PassStatus | null {
  if (typeof available !== "number" || typeof required !== "boolean") return null;
  return { available, required };
}

/** O passe só é debitado na trava, e editar o time salvo não gasta outro. */
export function passNotice({ available, required }: PassStatus, hasSavedTeam: boolean): PassNotice {
  if (!required) return { tone: "info", text: "Esta rodada não usa passe." };
  if (available < 1) return { tone: "warning", text: PASS_REQUIRED_MESSAGE };
  if (hasSavedTeam) return { tone: "info", text: "Rodada coberta: 1 passe será usado na trava. Editar o time não gasta outro." };
  return { tone: "info", text: "1 passe será usado só na trava da rodada. Até lá, editar o time não gasta outro." };
}
