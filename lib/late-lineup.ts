import type { SupabaseClient } from "@supabase/supabase-js";
import { isLateLineupOpen, isRoundEditable, startedClubIds } from "@/lib/lineup-rules";
import type { StatusRodada } from "@/lib/types";

export type LateLineupState = { open: boolean; startedClubIds: Set<number> };

const CLOSED: LateLineupState = { open: false, startedClubIds: new Set() };

/**
 * Estado da escalação tardia da rodada, lido dos jogos. O banco revalida tudo
 * em `fn_salvar_escalacao`; aqui serve para montar a tela e filtrar o mercado.
 */
export async function getLateLineupState(
  supabase: SupabaseClient,
  round: { id: number; status: StatusRodada; trava_em: string } | null | undefined,
  now = new Date(),
): Promise<LateLineupState> {
  if (!round || isRoundEditable(round, now) || (round.status !== "ABERTA" && round.status !== "EM_ANDAMENTO")) return CLOSED;
  const { data: games } = await supabase
    .from("jogos")
    .select("clube_casa_id, clube_fora_id, inicio_em, inicio_simulado_em, status")
    .eq("rodada_id", round.id);
  if (!games?.length || !isLateLineupOpen(round, games, now)) return CLOSED;
  return { open: true, startedClubIds: startedClubIds(games, now) };
}
