import { unstable_noStore as noStore } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusRodada } from "@/lib/types";

type CurrentRound = {
  status: StatusRodada;
  trava_em: string;
  numero: number;
  simulada?: boolean;
};

const roundPriority: Record<StatusRodada, number> = {
  EM_ANDAMENTO: 0,
  ABERTA: 1,
  FECHADA: 2,
  AGENDADA: 3,
};

/**
 * Escolhe a rodada exibida: em andamento, depois aberta, fechada e agendada.
 * Rodadas simuladas desempatam pelo número mais alto; as reais, pela trava
 * mais recente (ou a próxima trava, para rodadas agendadas).
 */
export function pickCurrentRound<T extends CurrentRound>(rounds: T[], { simulated }: { simulated: boolean }): T | null {
  return [...rounds].sort((first, second) => {
    const priorityDifference = roundPriority[first.status] - roundPriority[second.status];
    if (priorityDifference !== 0) return priorityDifference;
    if (simulated) return second.numero - first.numero;

    const firstLock = new Date(first.trava_em).getTime();
    const secondLock = new Date(second.trava_em).getTime();
    return first.status === "AGENDADA" ? firstLock - secondLock : secondLock - firstLock;
  })[0] ?? null;
}

function currentSeason() {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza",
    year: "numeric",
  }).format(new Date()));
}

/**
 * Fonte única para a rodada atual exibida ao usuário.
 * Ordem: rodadas reais da temporada corrente; se não houver, rodadas simuladas
 * (ambiente de teste); por fim, a temporada mais recente cadastrada.
 */
export async function getCurrentRound<T extends CurrentRound>(supabase: SupabaseClient, select: string) {
  noStore();
  const [currentSeasonResult, simulationResult] = await Promise.all([
    supabase.from("rodadas").select(select).eq("temporada", currentSeason()).eq("simulada", false),
    supabase.from("rodadas").select(select).eq("simulada", true),
  ]);

  if (currentSeasonResult.error) return { data: null as T | null, error: currentSeasonResult.error };
  if (currentSeasonResult.data?.length) {
    return { data: pickCurrentRound(currentSeasonResult.data as unknown as T[], { simulated: false }), error: null };
  }

  if (simulationResult.error) return { data: null as T | null, error: simulationResult.error };
  if (simulationResult.data?.length) {
    return { data: pickCurrentRound(simulationResult.data as unknown as T[], { simulated: true }), error: null };
  }

  const fallbackResult = await supabase.from("rodadas").select(select).order("temporada", { ascending: false });
  if (fallbackResult.error || !fallbackResult.data) return { data: null as T | null, error: fallbackResult.error };

  return { data: pickCurrentRound(fallbackResult.data as unknown as T[], { simulated: false }), error: null };
}
