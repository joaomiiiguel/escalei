// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lastGameByClub, lastGameRoles, marketRank, NO_ROLE_LABEL, playerRoleLabel } from "@/lib/player-role";

const createClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient }));
import { GET } from "@/app/api/jogadores/route";

const stat = (jogo_id: number, clube_id: number, jogador_id: number, substituto = false) => ({ jogo_id, clube_id, jogador_id, substituto });

describe("último jogo do clube", () => {
  it("fica com o jogo mais recente de cada clube", () => {
    const games = [
      { id: 20, clube_casa_id: 1, clube_fora_id: 2 },
      { id: 19, clube_casa_id: 3, clube_fora_id: 1 },
      { id: 18, clube_casa_id: 4, clube_fora_id: 3 },
    ];
    expect([...lastGameByClub(games)]).toEqual([[1, 20], [2, 20], [3, 19], [4, 18]]);
  });
});

describe("titular ou reserva", () => {
  const lastGames = new Map([[1, 20], [2, 20]]);

  it("usa apenas o último jogo do clube", () => {
    const roles = lastGameRoles(lastGames, [stat(20, 1, 10), stat(20, 1, 11, true), stat(19, 1, 12)]);
    expect(roles.get(1)?.get(10)).toBe("TITULAR");
    expect(roles.get(1)?.get(11)).toBe("RESERVA");
    expect(roles.get(1)?.has(12)).toBe(false);
  });

  it("não usa jogo de outro clube para um jogador transferido", () => {
    const roles = lastGameRoles(lastGames, [stat(20, 1, 10), stat(20, 2, 30)]);
    expect(roles.get(2)?.has(10)).toBe(false);
  });

  it("deixa sem dados o clube com mais de 11 titulares", () => {
    const rows = Array.from({ length: 23 }, (_, index) => stat(20, 1, index + 1));
    expect(lastGameRoles(lastGames, [...rows, stat(20, 2, 30)]).has(1)).toBe(false);
  });

  it("deixa sem dados o clube sem nenhum titular", () => {
    expect(lastGameRoles(lastGames, [stat(20, 1, 10, true), stat(20, 1, 11, true)]).has(1)).toBe(false);
  });

  it("aceita menos de 11 titulares, pois nem todos estão no catálogo", () => {
    const rows = Array.from({ length: 9 }, (_, index) => stat(20, 1, index + 1));
    expect(lastGameRoles(lastGames, rows).get(1)?.get(1)).toBe("TITULAR");
  });

  it("escreve que o dado é do último jogo", () => {
    expect(playerRoleLabel("TITULAR")).toBe("Titular no último jogo");
    expect(playerRoleLabel("RESERVA")).toBe("Reserva no último jogo");
    expect(playerRoleLabel(null)).toBe(NO_ROLE_LABEL);
  });
});

describe("ordem no mercado", () => {
  it("indisponível fica por último mesmo tendo sido titular", () => {
    expect([marketRank("TITULAR", false), marketRank("RESERVA", false), marketRank(null, false), marketRank("TITULAR", true)]).toEqual([0, 1, 2, 3]);
    expect(marketRank(undefined, false)).toBe(2);
  });
});

describe("GET /api/jogadores", () => {
  const players = [
    { id: 10, clube_id: 1, nome: "A", nome_exibicao: "A", posicao: "ATA", preco: 5, status: "PROVAVEL", status_motivo: null, clubes: { nome: "Clube", sigla: "CLU", logo_url: null } },
    { id: 11, clube_id: 1, nome: "B", nome_exibicao: "B", posicao: "ATA", preco: 5, status: "PROVAVEL", status_motivo: null, clubes: { nome: "Clube", sigla: "CLU", logo_url: null } },
    { id: 12, clube_id: 3, nome: "C", nome_exibicao: "C", posicao: "ATA", preco: 5, status: "PROVAVEL", status_motivo: null, clubes: { nome: "Outro", sigla: "OUT", logo_url: null } },
  ];

  function client(results: Record<string, { data: unknown; error?: unknown }>) {
    return {
      from(table: string) {
        const result = { error: null, ...results[table] };
        const chain = { select: () => chain, eq: () => chain, in: () => chain, order: () => chain, limit: () => chain, then: (resolve: (value: unknown) => void) => resolve(result) };
        return chain;
      },
    };
  }

  const load = async () => (await (await GET(new Request("http://localhost/api/jogadores?posicao=ATA"))).json()) as { players: { id: number; lastGameRole: string | null }[] };

  beforeEach(() => createClient.mockReset());

  it("devolve o papel no último jogo e `null` para quem não tem dado", async () => {
    createClient.mockResolvedValue(client({
      jogadores: { data: players },
      jogos: { data: [{ id: 20, clube_casa_id: 1, clube_fora_id: 2 }] },
      estatisticas_jogador: { data: [stat(20, 1, 10), stat(20, 1, 11, true)] },
    }));
    expect((await load()).players.map((player) => [player.id, player.lastGameRole])).toEqual([[10, "TITULAR"], [11, "RESERVA"], [12, null]]);
  });

  it("mantém o mercado quando a leitura dos jogos falha", async () => {
    createClient.mockResolvedValue(client({
      jogadores: { data: players },
      jogos: { data: null, error: { message: "falha" } },
    }));
    expect((await load()).players.map((player) => player.lastGameRole)).toEqual([null, null, null]);
  });
});
