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

function currentSeason() {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza",
    year: "numeric",
  }).format(new Date()));
}

/** Fonte única para a rodada atual exibida ao usuário. */
export async function getCurrentRound<T extends CurrentRound>(supabase: SupabaseClient, select: string) {
  noStore();
  const [simulationResult, currentSeasonResult] = await Promise.all([
    supabase.from("rodadas").select(select).eq("simulada", true),
    supabase
    .from("rodadas")
    .select(select)
    .eq("temporada", currentSeason()),
  ]);

  if (simulationResult.error) return { data: null as T | null, error: simulationResult.error };
  if (simulationResult.data?.length) {
    const round = (simulationResult.data as unknown as T[])
      .sort((first, second) => roundPriority[first.status] - roundPriority[second.status] || second.numero - first.numero)[0];
    return { data: round ?? null, error: null };
  }

  if (currentSeasonResult.error) return { data: null as T | null, error: currentSeasonResult.error };

  // O ambiente de teste usa a última temporada liberada pela API gratuita.
  // Em produção, a primeira consulta sempre encontra a temporada corrente.
  const fallbackResult = currentSeasonResult.data?.length
    ? currentSeasonResult
    : await supabase.from("rodadas").select(select).order("temporada", { ascending: false });

  if (fallbackResult.error || !fallbackResult.data) return { data: null as T | null, error: fallbackResult.error };

  const round = (fallbackResult.data as unknown as T[])
    .sort((first, second) => {
      const priorityDifference = roundPriority[first.status] - roundPriority[second.status];
      if (priorityDifference !== 0) return priorityDifference;

      const firstLock = new Date(first.trava_em).getTime();
      const secondLock = new Date(second.trava_em).getTime();
      return first.status === "AGENDADA" ? firstLock - secondLock : secondLock - firstLock;
    })[0] ?? null;

  return { data: round, error: null };
}
