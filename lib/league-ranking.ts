export type MemberProfile = {
  apelido: string;
  clubes: { sigla: string } | { sigla: string }[] | null;
};

export type LeagueMemberInput = {
  usuario_id: string;
  profile: MemberProfile;
};

export type RankingRowInput = {
  usuario_id: string;
  apelido: string;
  clube_sigla: string | null;
  pontos: number | string;
  posicao: number;
  posicao_anterior?: number | null;
  gols_escalados?: number;
  custo?: number | string;
  salvo_em?: string;
  atualizado_em?: string | null;
  is_current_user?: boolean;
};

export type CombinedLeagueMember = {
  usuario_id: string;
  profile: MemberProfile;
  points: number | null;
  position: number | null;
  isCurrentUser: boolean;
  lastUpdated: string | null;
  hasTeam: boolean;
};

export function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function formatInitials(value: string): string {
  return (
    value
      .split(/[.\s_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toLocaleUpperCase("pt-BR") || "—"
  );
}

export function formatPoints(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function combineLeagueRanking({
  members,
  rankingRows,
  currentUserId,
}: {
  members: LeagueMemberInput[];
  rankingRows: RankingRowInput[];
  currentUserId: string;
}): {
  combinedRanking: CombinedLeagueMember[];
  currentMember: CombinedLeagueMember | undefined;
  differenceToLeader: number | null;
  lastUpdated: string | null;
} {
  const rankedMap = new Map(rankingRows.map((row) => [row.usuario_id, row]));

  const rankedList: CombinedLeagueMember[] = rankingRows.map((row) => ({
    usuario_id: row.usuario_id,
    profile: {
      apelido: row.apelido,
      clubes: { sigla: row.clube_sigla ?? "—" },
    },
    points: Number(row.pontos),
    position: row.posicao,
    isCurrentUser: row.usuario_id === currentUserId,
    lastUpdated: row.atualizado_em ?? null,
    hasTeam: true,
  }));

  const unrankedList: CombinedLeagueMember[] = members
    .filter((member) => !rankedMap.has(member.usuario_id))
    .map((member) => ({
      usuario_id: member.usuario_id,
      profile: member.profile,
      points: null,
      position: null,
      isCurrentUser: member.usuario_id === currentUserId,
      lastUpdated: null,
      hasTeam: false,
    }));

  const combinedRanking = [...rankedList, ...unrankedList];
  const currentMember = combinedRanking.find((member) => member.isCurrentUser);
  const leader = rankedList[0];
  const differenceToLeader =
    currentMember &&
    currentMember.points !== null &&
    leader &&
    leader.points !== null
      ? Math.max(0, leader.points - currentMember.points)
      : null;

  const lastUpdated = rankedList[0]?.lastUpdated ?? null;

  return {
    combinedRanking,
    currentMember,
    differenceToLeader,
    lastUpdated,
  };
}
