import type { StatusRodada } from "@/lib/types";

export type ProfileTeam = { pontos: number | string | null; rodadas: { status: StatusRodada } | { status: StatusRodada }[] | null };
export type ProfileLeague = { ligas: { arquivada_em: string | null } | { arquivada_em: string | null }[] | null };

export type ProfileStats = {
  /** Rodadas que já travaram com time do usuário (em andamento ou fechadas). */
  roundsPlayed: number;
  /** Média só das rodadas fechadas; `null` antes da primeira fechar. */
  averagePoints: number | null;
  /** Ligas ativas, sem as arquivadas. */
  leagues: number;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Números da carteirinha do perfil. A rodada aberta não conta: o time ainda não pontuou. */
export function profileStats(teams: ProfileTeam[], memberships: ProfileLeague[]): ProfileStats {
  const played = teams.filter((team) => {
    const status = first(team.rodadas)?.status;
    return status === "EM_ANDAMENTO" || status === "FECHADA";
  });
  const closed = played.filter((team) => first(team.rodadas)?.status === "FECHADA");
  const total = closed.reduce((sum, team) => sum + Number(team.pontos ?? 0), 0);

  return {
    roundsPlayed: played.length,
    averagePoints: closed.length ? Math.round((total / closed.length) * 100) / 100 : null,
    leagues: memberships.filter((membership) => {
      const league = first(membership.ligas);
      return league !== null && !league.arquivada_em;
    }).length,
  };
}
