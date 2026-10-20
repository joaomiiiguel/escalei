import { describe, it, expect } from "vitest";
import {
  combineLeagueRanking,
  formatInitials,
  formatPoints,
  type LeagueMemberInput,
  type RankingRowInput,
} from "@/lib/league-ranking";

describe("League Ranking Utilities", () => {
  describe("formatInitials", () => {
    it("should format two initials from space-separated name", () => {
      expect(formatInitials("João Silva")).toBe("JS");
    });

    it("should format initials with dots or underscores", () => {
      expect(formatInitials("joao.miguel")).toBe("JM");
      expect(formatInitials("joao_miguel")).toBe("JM");
    });

    it("should fallback to — for empty string", () => {
      expect(formatInitials("")).toBe("—");
    });
  });

  describe("formatPoints", () => {
    it("should format decimal numbers with pt-BR locale", () => {
      expect(formatPoints(72.5)).toBe("72,5");
      expect(formatPoints(0)).toBe("0,0");
      expect(formatPoints(100)).toBe("100,0");
    });
  });

  describe("combineLeagueRanking", () => {
    const mockMembers: LeagueMemberInput[] = [
      {
        usuario_id: "user-1",
        profile: { apelido: "Jogador Um", clubes: { sigla: "FLA" } },
      },
      {
        usuario_id: "user-2",
        profile: { apelido: "Jogador Dois", clubes: { sigla: "PAL" } },
      },
      {
        usuario_id: "user-3",
        profile: { apelido: "Jogador Tres", clubes: { sigla: "COR" } },
      },
    ];

    it("should list all members when all have round scores", () => {
      const mockRanking: RankingRowInput[] = [
        {
          usuario_id: "user-2",
          apelido: "Jogador Dois",
          clube_sigla: "PAL",
          pontos: 85.5,
          posicao: 1,
          is_current_user: false,
        },
        {
          usuario_id: "user-1",
          apelido: "Jogador Um",
          clube_sigla: "FLA",
          pontos: 70.0,
          posicao: 2,
          is_current_user: true,
        },
        {
          usuario_id: "user-3",
          apelido: "Jogador Tres",
          clube_sigla: "COR",
          pontos: 55.2,
          posicao: 3,
          is_current_user: false,
        },
      ];

      const result = combineLeagueRanking({
        members: mockMembers,
        rankingRows: mockRanking,
        currentUserId: "user-1",
      });

      expect(result.combinedRanking).toHaveLength(3);
      expect(result.combinedRanking[0].usuario_id).toBe("user-2");
      expect(result.combinedRanking[0].position).toBe(1);
      expect(result.combinedRanking[0].points).toBe(85.5);
      expect(result.combinedRanking[0].hasTeam).toBe(true);

      expect(result.currentMember?.usuario_id).toBe("user-1");
      expect(result.currentMember?.isCurrentUser).toBe(true);
      expect(result.currentMember?.position).toBe(2);
      expect(result.differenceToLeader).toBe(15.5);
    });

    it("should list members who did not submit a team at the bottom with null points", () => {
      // Only user-2 submitted a team
      const mockRanking: RankingRowInput[] = [
        {
          usuario_id: "user-2",
          apelido: "Jogador Dois",
          clube_sigla: "PAL",
          pontos: 85.5,
          posicao: 1,
          is_current_user: false,
        },
      ];

      const result = combineLeagueRanking({
        members: mockMembers,
        rankingRows: mockRanking,
        currentUserId: "user-1",
      });

      expect(result.combinedRanking).toHaveLength(3);
      // Ranked first
      expect(result.combinedRanking[0].usuario_id).toBe("user-2");
      expect(result.combinedRanking[0].hasTeam).toBe(true);
      expect(result.combinedRanking[0].points).toBe(85.5);

      // Unranked members follow
      const unranked = result.combinedRanking.slice(1);
      expect(unranked.map((m) => m.usuario_id)).toEqual(["user-1", "user-3"]);
      expect(unranked[0].points).toBeNull();
      expect(unranked[0].position).toBeNull();
      expect(unranked[0].hasTeam).toBe(false);

      // Current user is unranked
      expect(result.currentMember?.usuario_id).toBe("user-1");
      expect(result.currentMember?.position).toBeNull();
      expect(result.differenceToLeader).toBeNull();
    });

    it("should list all members when ranking is completely empty", () => {
      const result = combineLeagueRanking({
        members: mockMembers,
        rankingRows: [],
        currentUserId: "user-1",
      });

      expect(result.combinedRanking).toHaveLength(3);
      expect(result.combinedRanking.every((m) => m.points === null)).toBe(true);
      expect(result.combinedRanking.every((m) => m.hasTeam === false)).toBe(true);
      expect(result.differenceToLeader).toBeNull();
      expect(result.currentMember?.usuario_id).toBe("user-1");
    });

    it("should calculate differenceToLeader as 0 when current user is the leader", () => {
      const mockRanking: RankingRowInput[] = [
        {
          usuario_id: "user-1",
          apelido: "Jogador Um",
          clube_sigla: "FLA",
          pontos: 92.0,
          posicao: 1,
          is_current_user: true,
        },
      ];

      const result = combineLeagueRanking({
        members: mockMembers,
        rankingRows: mockRanking,
        currentUserId: "user-1",
      });

      expect(result.differenceToLeader).toBe(0);
    });
  });
});
