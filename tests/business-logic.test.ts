import { describe, expect, it, vi } from "vitest";
import {
  FORMATIONS,
  isFormation,
  isRoundEditable,
  lineupCost,
  normalizePlayerIds,
  playerRoundStatus,
  validateLineup,
  type Formation,
  type LineupPlayer,
  type Position,
} from "@/lib/lineup-rules";

// `vitest.setup.ts` substitui o módulo por um mock; aqui testamos a implementação real.
const { getCurrentRound, pickCurrentRound } = await vi.importActual<typeof import("@/lib/current-round")>("@/lib/current-round");

function lineupFor(formation: Formation, price = 5): LineupPlayer[] {
  return (Object.keys(FORMATIONS[formation]) as Position[]).flatMap((position) =>
    Array.from({ length: FORMATIONS[formation][position] }, () => ({ posicao: position, preco: price })),
  );
}

describe("formações", () => {
  it.each(Object.keys(FORMATIONS) as Formation[])("aceita uma escalação %s completa", (formation) => {
    expect(validateLineup(formation, lineupFor(formation), 60)).toBeNull();
  });

  it("aceita somente as formações do regulamento", () => {
    expect(isFormation("4-3-3")).toBe(true);
    expect(isFormation("5-4-1")).toBe(false);
    expect(isFormation("toString")).toBe(false);
    expect(validateLineup("5-4-1", lineupFor("4-3-3"), 60)).toBe("Formação inválida.");
  });

  it("recusa posições que não batem com a formação", () => {
    expect(validateLineup("4-4-2", lineupFor("4-3-3"), 60)).toBe("Os jogadores não correspondem à formação escolhida.");
  });

  it("recusa escalação incompleta", () => {
    expect(validateLineup("4-3-3", lineupFor("4-3-3").slice(1), 60)).toBe("Selecione os 11 jogadores antes de salvar.");
  });

  it("normaliza ids e recusa repetidos ou inválidos", () => {
    const ids = Array.from({ length: 11 }, (_, index) => index + 1);
    expect(normalizePlayerIds(ids)).toEqual(ids);
    expect(normalizePlayerIds([...ids.slice(0, 10), 1])).toBeNull();
    expect(normalizePlayerIds([...ids.slice(0, 10), 0])).toBeNull();
    expect(normalizePlayerIds("1,2,3")).toBeNull();
  });
});

describe("saldo", () => {
  it("soma o custo com duas casas, mesmo com preços em texto vindos do banco", () => {
    expect(lineupCost([{ posicao: "GOL", preco: "5.10" }, { posicao: "DEF", preco: 4.2 }])).toBe(9.3);
  });

  it("aceita custo igual ao saldo inicial de C$ 60", () => {
    const players = lineupFor("4-3-3", 5);
    players[0] = { ...players[0], preco: 10 };
    expect(lineupCost(players)).toBe(60);
    expect(validateLineup("4-3-3", players, 60)).toBeNull();
  });

  it("recusa custo acima do saldo atual", () => {
    expect(validateLineup("4-3-3", lineupFor("4-3-3", 6), 60)).toBe("A escalação ultrapassa o seu saldo disponível.");
  });

  it("não tem teto fixo de C$ 100 quando o saldo cresceu", () => {
    expect(validateLineup("4-3-3", lineupFor("4-3-3", 10), 120)).toBeNull();
  });
});

describe("trava da rodada", () => {
  const now = new Date("2026-10-25T15:00:00-03:00");

  it("permite editar rodada aberta antes da trava", () => {
    expect(isRoundEditable({ status: "ABERTA", trava_em: "2026-10-25T16:00:00-03:00" }, now)).toBe(true);
  });

  it("bloqueia no instante da trava e depois dela", () => {
    expect(isRoundEditable({ status: "ABERTA", trava_em: "2026-10-25T15:00:00-03:00" }, now)).toBe(false);
    expect(isRoundEditable({ status: "ABERTA", trava_em: "2026-10-25T14:59:00-03:00" }, now)).toBe(false);
  });

  it.each(["AGENDADA", "EM_ANDAMENTO", "FECHADA"] as const)("bloqueia rodada %s", (status) => {
    expect(isRoundEditable({ status, trava_em: "2026-10-26T16:00:00-03:00" }, now)).toBe(false);
  });

  it("bloqueia quando não há rodada", () => {
    expect(isRoundEditable(null, now)).toBe(false);
  });
});

describe("rodada atual", () => {
  const round = (numero: number, status: "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA", trava_em: string) => ({ numero, status, trava_em });

  it("prioriza em andamento, depois aberta, fechada e agendada", () => {
    const rounds = [
      round(1, "FECHADA", "2026-10-01T16:00:00Z"),
      round(3, "AGENDADA", "2026-10-20T16:00:00Z"),
      round(2, "ABERTA", "2026-10-10T16:00:00Z"),
    ];
    expect(pickCurrentRound(rounds, { simulated: false })?.numero).toBe(2);
    expect(pickCurrentRound([...rounds, round(4, "EM_ANDAMENTO", "2026-10-05T16:00:00Z")], { simulated: false })?.numero).toBe(4);
  });

  it("entre fechadas usa a trava mais recente e entre agendadas a mais próxima", () => {
    expect(pickCurrentRound([round(1, "FECHADA", "2026-10-01T16:00:00Z"), round(2, "FECHADA", "2026-10-08T16:00:00Z")], { simulated: false })?.numero).toBe(2);
    expect(pickCurrentRound([round(5, "AGENDADA", "2026-11-08T16:00:00Z"), round(4, "AGENDADA", "2026-11-01T16:00:00Z")], { simulated: false })?.numero).toBe(4);
  });

  it("em rodadas simuladas desempata pelo maior número", () => {
    expect(pickCurrentRound([round(30, "FECHADA", "2026-10-01T16:00:00Z"), round(31, "FECHADA", "2026-09-01T16:00:00Z")], { simulated: true })?.numero).toBe(31);
  });

  it("devolve null sem rodadas", () => {
    expect(pickCurrentRound([], { simulated: false })).toBeNull();
  });
});

describe("situação do jogo do escalado", () => {
  it.each([
    ["ENCERRADO", "ENCERRADO"],
    ["EM_ANDAMENTO", "EM_ANDAMENTO"],
    ["A_JOGAR", "A_JOGAR"],
    ["ADIADO", "ADIADO"],
    ["CANCELADO", "ADIADO"],
    ["DESCONHECIDO", "SEM_JOGO"],
    [undefined, "SEM_JOGO"],
  ])("mapeia %s para %s", (gameStatus, expected) => {
    expect(playerRoundStatus(gameStatus)).toBe(expected);
  });
});

describe("fonte da rodada atual", () => {
  type Row = { id: number; numero: number; status: "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA"; trava_em: string; temporada: number; simulada: boolean };
  /** Supabase falso: aplica os filtros `eq` sobre as linhas informadas. */
  function fakeSupabase(rows: Row[]) {
    return {
      from: () => ({
        select: () => {
          const filters: Array<[keyof Row, unknown]> = [];
          const result = () => ({ data: rows.filter((row) => filters.every(([column, value]) => row[column] === value)), error: null });
          const builder = {
            eq: (column: keyof Row, value: unknown) => { filters.push([column, value]); return builder; },
            order: async () => result(),
            then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
          };
          return builder;
        },
      }),
    } as never;
  }
  const season = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Fortaleza", year: "numeric" }).format(new Date()));
  const simulated: Row = { id: 1, numero: 31, status: "ABERTA", trava_em: "2026-10-20T00:00:00Z", temporada: 2024, simulada: true };
  const real33: Row = { id: 2, numero: 33, status: "ABERTA", trava_em: "2026-10-28T21:30:00Z", temporada: season, simulada: false };
  const real34: Row = { id: 3, numero: 34, status: "AGENDADA", trava_em: "2026-11-01T18:00:00Z", temporada: season, simulada: false };

  it("prefere as rodadas reais da temporada corrente às simuladas", async () => {
    const { data } = await getCurrentRound<Row>(fakeSupabase([simulated, real34, real33]), "*");
    expect(data?.numero).toBe(33);
  });

  it("usa a simulação quando ainda não há rodadas reais", async () => {
    const { data } = await getCurrentRound<Row>(fakeSupabase([simulated]), "*");
    expect(data?.numero).toBe(31);
  });
});
