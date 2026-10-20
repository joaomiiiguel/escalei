import { describe, it, expect, vi } from "vitest";

const FORMATIONS = {
  "4-3-3": { ATA: 3, DEF: 4, GOL: 1, MEI: 3 },
  "4-4-2": { ATA: 2, DEF: 4, GOL: 1, MEI: 4 },
  "3-5-2": { ATA: 2, DEF: 3, GOL: 1, MEI: 5 },
} as const;

type Formation = keyof typeof FORMATIONS;
type Position = keyof (typeof FORMATIONS)[Formation];

function validateFormation(formation: string, players: Array<{ posicao: Position; preco: number }>): { valid: boolean; error?: string; cost?: number } {
  if (!(formation in FORMATIONS)) {
    return { valid: false, error: "Formação inválida." };
  }

  if (players.length !== 11) {
    return { valid: false, error: "Selecione os 11 jogadores antes de salvar." };
  }

  const formationKey = formation as Formation;
  const positions = players.reduce<Record<Position, number>>((counts, player) => {
    counts[player.posicao] += 1;
    return counts;
  }, { ATA: 0, DEF: 0, GOL: 0, MEI: 0 });

  const isValidFormation = (Object.keys(FORMATIONS[formationKey]) as Position[]).every(
    (position) => positions[position] === FORMATIONS[formationKey][position]
  );

  if (!isValidFormation) {
    return { valid: false, error: "Os jogadores não correspondem à formação escolhida." };
  }

  const cost = players.reduce((total, player) => total + Number(player.preco), 0);
  return { valid: true, cost };
}

describe("Formation Validation", () => {
  describe("validateFormation", () => {
    it("should reject invalid formation", () => {
      const result = validateFormation("5-5-5", []);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Formação inválida.");
    });

    it("should reject wrong number of players", () => {
      const players = Array(10).fill({ posicao: "ATA" as Position, preco: 10 });
      const result = validateFormation("4-3-3", players);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Selecione os 11 jogadores antes de salvar.");
    });

    it("should validate 4-3-3 formation correctly", () => {
      const players = [
        ...Array(3).fill({ posicao: "ATA" as Position, preco: 12 }),
        ...Array(3).fill({ posicao: "MEI" as Position, preco: 10 }),
        ...Array(4).fill({ posicao: "DEF" as Position, preco: 8 }),
        { posicao: "GOL" as Position, preco: 6 },
      ];
      const result = validateFormation("4-3-3", players);
      expect(result.valid).toBe(true);
      expect(result.cost).toBe(3 * 12 + 3 * 10 + 4 * 8 + 6);
    });

    it("should validate 4-4-2 formation correctly", () => {
      const players = [
        ...Array(2).fill({ posicao: "ATA" as Position, preco: 12 }),
        ...Array(4).fill({ posicao: "MEI" as Position, preco: 10 }),
        ...Array(4).fill({ posicao: "DEF" as Position, preco: 8 }),
        { posicao: "GOL" as Position, preco: 6 },
      ];
      const result = validateFormation("4-4-2", players);
      expect(result.valid).toBe(true);
      expect(result.cost).toBe(2 * 12 + 4 * 10 + 4 * 8 + 6);
    });

    it("should validate 3-5-2 formation correctly", () => {
      const players = [
        ...Array(2).fill({ posicao: "ATA" as Position, preco: 12 }),
        ...Array(5).fill({ posicao: "MEI" as Position, preco: 10 }),
        ...Array(3).fill({ posicao: "DEF" as Position, preco: 8 }),
        { posicao: "GOL" as Position, preco: 6 },
      ];
      const result = validateFormation("3-5-2", players);
      expect(result.valid).toBe(true);
      expect(result.cost).toBe(2 * 12 + 5 * 10 + 3 * 8 + 6);
    });

    it("should reject wrong position counts for 4-3-3", () => {
      const players = [
        ...Array(4).fill({ posicao: "ATA" as Position, preco: 12 }), // 4 instead of 3
        ...Array(3).fill({ posicao: "MEI" as Position, preco: 10 }),
        ...Array(3).fill({ posicao: "DEF" as Position, preco: 8 }), // 3 instead of 4
        { posicao: "GOL" as Position, preco: 6 },
      ];
      const result = validateFormation("4-3-3", players);
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Os jogadores não correspondem à formação escolhida.");
    });
  });
});

describe("Budget Calculation", () => {
  it("should calculate total cost correctly", () => {
    const players = [
      { preco: 12.5, posicao: "ATA" as Position },
      { preco: 10.0, posicao: "ATA" as Position },
      { preco: 9.5, posicao: "MEI" as Position },
      { preco: 8.0, posicao: "MEI" as Position },
      { preco: 8.0, posicao: "MEI" as Position },
      { preco: 7.5, posicao: "DEF" as Position },
      { preco: 7.0, posicao: "DEF" as Position },
      { preco: 6.5, posicao: "DEF" as Position },
      { preco: 6.0, posicao: "DEF" as Position },
      { preco: 5.5, posicao: "GOL" as Position },
      { preco: 5.0, posicao: "DEF" as Position },
    ];
    const total = players.reduce((sum, p) => sum + p.preco, 0);
    expect(total).toBeCloseTo(85.5, 1);
  });

  it("should detect budget exceeded", () => {
    const players = Array(11).fill({ preco: 10, posicao: "ATA" as Position });
    const budget = 50;
    const total = players.reduce((sum, p) => sum + p.preco, 0);
    expect(total).toBeGreaterThan(budget);
  });
});

describe("Round Status Logic", () => {
  const roundStatusPriority: Record<string, number> = {
    EM_ANDAMENTO: 0,
    ABERTA: 1,
    FECHADA: 2,
    AGENDADA: 3,
  };

  it("should prioritize EM_ANDAMENTO over ABERTA", () => {
    const rounds = [
      { status: "ABERTA" as const, numero: 1 },
      { status: "EM_ANDAMENTO" as const, numero: 2 },
    ];
    const sorted = [...rounds].sort((a, b) => roundStatusPriority[a.status] - roundStatusPriority[b.status]);
    expect(sorted[0].status).toBe("EM_ANDAMENTO");
  });

  it("should prioritize ABERTA over FECHADA", () => {
    const rounds = [
      { status: "FECHADA" as const, numero: 1 },
      { status: "ABERTA" as const, numero: 2 },
    ];
    const sorted = [...rounds].sort((a, b) => roundStatusPriority[a.status] - roundStatusPriority[b.status]);
    expect(sorted[0].status).toBe("ABERTA");
  });
});

describe("Player Status Mapping", () => {
  function mapRoundStatus(rawStatus: string): "A_JOGAR" | "ADIADO" | "EM_ANDAMENTO" | "ENCERRADO" | "SEM_JOGO" {
    if (rawStatus === "ENCERRADO") return "ENCERRADO";
    if (rawStatus === "EM_ANDAMENTO") return "EM_ANDAMENTO";
    if (rawStatus === "A_JOGAR") return "A_JOGAR";
    if (rawStatus === "ADIADO" || rawStatus === "CANCELADO") return "ADIADO";
    return "SEM_JOGO";
  }

  it("should map ENCERRADO correctly", () => {
    expect(mapRoundStatus("ENCERRADO")).toBe("ENCERRADO");
  });

  it("should map EM_ANDAMENTO correctly", () => {
    expect(mapRoundStatus("EM_ANDAMENTO")).toBe("EM_ANDAMENTO");
  });

  it("should map A_JOGAR correctly", () => {
    expect(mapRoundStatus("A_JOGAR")).toBe("A_JOGAR");
  });

  it("should map ADIADO correctly", () => {
    expect(mapRoundStatus("ADIADO")).toBe("ADIADO");
    expect(mapRoundStatus("CANCELADO")).toBe("ADIADO");
  });

  it("should default to SEM_JOGO for unknown status", () => {
    expect(mapRoundStatus("DESCONHECIDO")).toBe("SEM_JOGO");
    expect(mapRoundStatus("")).toBe("SEM_JOGO");
  });
});

describe("Points Formatting", () => {
  function points(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  it("should format integer points", () => {
    expect(points(10)).toBe("10,0");
    expect(points(0)).toBe("0,0");
  });

  it("should format decimal points", () => {
    expect(points(10.5)).toBe("10,5");
    expect(points(10.25)).toBe("10,3"); // rounding
  });

  it("should format large numbers", () => {
    expect(points(1234.5)).toBe("1.234,5");
  });
});

describe("Currency Formatting", () => {
  function currency(value: number): string {
    return `C$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  it("should format currency correctly", () => {
    expect(currency(50)).toBe("C$ 50,00");
    expect(currency(50.5)).toBe("C$ 50,50");
    expect(currency(100)).toBe("C$ 100,00");
  });
});