import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusRodada } from "@/lib/types";

type CurrentRound = {
  status: StatusRodada;
  trava_em: string;
  numero: number;
};

const roundPriority: Record<StatusRodada, number> = {
  EM_ANDAMENTO: 0,
  ABERTA: 1,
  AGENDADA: 2,
  FECHADA: 3,
};

function currentSeason() {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Fortaleza",
    year: "numeric",
  }).format(new Date()));
}

/** Fonte única para a rodada atual exibida ao usuário. */
export async function getCurrentRound<T extends CurrentRound>(supabase: SupabaseClient, select: string) {
  const { data, error } = await supabase
    .from("rodadas")
    .select(select)
    .eq("temporada", currentSeason());

  if (error || !data) return { data: null as T | null, error };

  const round = (data as unknown as T[])
    .sort((first, second) => {
      const priorityDifference = roundPriority[first.status] - roundPriority[second.status];
      if (priorityDifference !== 0) return priorityDifference;

      const firstLock = new Date(first.trava_em).getTime();
      const secondLock = new Date(second.trava_em).getTime();
      return first.status === "AGENDADA" ? firstLock - secondLock : secondLock - firstLock;
    })[0] ?? null;

  return { data: round, error: null };
}
