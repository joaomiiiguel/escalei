/**
 * Lesionados e suspensos da rodada aberta (JOA-163), a partir de `/injuries?ids=`.
 * Funções puras: `advance-round` busca, estas regras decidem e
 * `fn_aplicar_status_jogadores` grava.
 */

export type ApiInjury = {
  player?: { id?: number | null; type?: string | null; reason?: string | null };
  fixture?: { id?: number | null };
};

export type PlayerStatus = "DUVIDA" | "LESIONADO" | "SUSPENSO";
export type PlayerStatusUpdate = { api_football_id: number; status: PlayerStatus; motivo: string };

/** Atualiza a cada 6 h enquanto a rodada está aberta. */
export const INJURIES_INTERVAL_MS = 6 * 3_600_000;
/** E uma última vez perto da trava, quando os clubes já divulgaram os desfalques. */
export const INJURIES_LAST_CALL_BEFORE_LOCK_MS = 2 * 3_600_000;
/** Depois de uma tentativa que falhou, espera antes de consultar de novo. */
export const INJURIES_RETRY_MS = 30 * 60_000;

const SUSPENSION_REASONS: Record<string, string> = {
  "red card": "Expulso",
  "yellow cards": "3º amarelo",
  "suspended": "Suspenso",
};

/** Motivos que a API usa no Brasileirão; os demais caem em "Lesão". */
const INJURY_REASONS: Record<string, string> = {
  "injury": "Lesão",
  "muscle injury": "Lesão muscular",
  "knee injury": "Lesão no joelho",
  "calf injury": "Lesão na panturrilha",
  "thigh injury": "Lesão na coxa",
  "hamstring injury": "Lesão na posterior da coxa",
  "ankle injury": "Lesão no tornozelo",
  "foot injury": "Lesão no pé",
  "leg injury": "Lesão na perna",
  "broken leg": "Fratura na perna",
  "hip injury": "Lesão no quadril",
  "back injury": "Lesão nas costas",
  "lower back injury": "Lesão na lombar",
  "shoulder injury": "Lesão no ombro",
  "ribs injury": "Lesão nas costelas",
  "jaw injury": "Lesão na mandíbula",
  "achilles tendon injury": "Lesão no tendão de Aquiles",
  "groin injury": "Lesão na virilha",
  "illness": "Doença",
};

/**
 * Status de um registro de `/injuries`:
 * - "Missing Fixture" com motivo de cartão → SUSPENSO; com outro motivo → LESIONADO;
 * - "Questionable" → DUVIDA;
 * - "Inactive" (fora dos relacionados, sem lesão informada) → DUVIDA, para não
 *   bloquear a escalação sem um motivo claro.
 */
export function injuryStatus(type: string | null | undefined, reason: string | null | undefined): { status: PlayerStatus; motivo: string } | null {
  const key = (reason ?? "").trim().toLowerCase();
  if (type === "Questionable") return { status: "DUVIDA", motivo: key === "inactive" ? "Inativo" : INJURY_REASONS[key] ?? "Lesão" };
  if (type !== "Missing Fixture") return null;
  if (SUSPENSION_REASONS[key]) return { status: "SUSPENSO", motivo: SUSPENSION_REASONS[key] };
  if (key === "inactive") return { status: "DUVIDA", motivo: "Inativo" };
  return { status: "LESIONADO", motivo: INJURY_REASONS[key] ?? "Lesão" };
}

const SEVERITY: Record<PlayerStatus, number> = { DUVIDA: 1, LESIONADO: 2, SUSPENSO: 2 };

/** Um status por jogador: a API repete registros, e o mais grave prevalece. */
export function buildPlayerStatuses(injuries: ApiInjury[]): PlayerStatusUpdate[] {
  const byPlayer = new Map<number, PlayerStatusUpdate>();
  for (const injury of injuries) {
    const id = injury.player?.id;
    const result = injuryStatus(injury.player?.type, injury.player?.reason);
    if (!id || !result) continue;
    const current = byPlayer.get(id);
    if (!current || SEVERITY[result.status] > SEVERITY[current.status]) byPlayer.set(id, { api_football_id: id, ...result });
  }
  return [...byPlayer.values()].sort((a, b) => a.api_football_id - b.api_football_id);
}

/**
 * Se é hora de consultar: só com a rodada aberta e antes da trava; na primeira
 * passada depois da abertura, a cada 6 h e uma vez nas 2 h finais antes da trava.
 * Uma tentativa que falhou só se repete depois de `INJURIES_RETRY_MS`.
 */
export function injuriesSyncDue(
  round: { status: string; abre_em: string | null; trava_em: string },
  history: { lastSuccessAt: string | null; lastAttemptAt: string | null },
  now: Date,
): boolean {
  const lock = new Date(round.trava_em).getTime();
  const nowMs = now.getTime();
  if (round.status !== "ABERTA" || nowMs >= lock) return false;
  const attempt = history.lastAttemptAt ? new Date(history.lastAttemptAt).getTime() : null;
  const success = history.lastSuccessAt ? new Date(history.lastSuccessAt).getTime() : null;
  if (attempt !== null && (success === null || attempt > success) && nowMs - attempt < INJURIES_RETRY_MS) return false;
  if (success === null) return true;
  const last = success;
  if (round.abre_em && last < new Date(round.abre_em).getTime()) return true;
  if (nowMs - last >= INJURIES_INTERVAL_MS) return true;
  const lastCall = lock - INJURIES_LAST_CALL_BEFORE_LOCK_MS;
  return nowMs >= lastCall && last < lastCall;
}
