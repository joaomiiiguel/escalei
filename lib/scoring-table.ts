/**
 * Tabela de pontuação exibida em "Como funciona". Os valores espelham a
 * versão 1 de `tabela_pontuacao` (migration `implement_match_scoring`);
 * `tests/scoring-table.test.ts` falha se os dois divergirem.
 */
export type ScoringRow = { scout: string; label: string; pontos: number };

export const SCORING_TABLE: ScoringRow[] = [
  { scout: "gols", label: "Gol", pontos: 8 },
  { scout: "assistencias", label: "Assistência", pontos: 5 },
  { scout: "finalizacoes_no_gol", label: "Finalização no gol (sem virar gol)", pontos: 1.2 },
  { scout: "finalizacoes_fora", label: "Finalização para fora", pontos: 0.8 },
  { scout: "desarmes", label: "Desarme", pontos: 1.5 },
  { scout: "faltas_sofridas", label: "Falta sofrida", pontos: 0.5 },
  { scout: "penaltis_sofridos", label: "Pênalti sofrido", pontos: 1 },
  { scout: "defesas", label: "Defesa (GOL)", pontos: 1.3 },
  { scout: "penaltis_defendidos", label: "Defesa de pênalti (GOL)", pontos: 7 },
  { scout: "sem_sofrer_gol", label: "Jogo sem sofrer gol (GOL, DEF)", pontos: 5 },
  { scout: "gols_sofridos", label: "Gol sofrido (GOL)", pontos: -1 },
  { scout: "faltas_cometidas", label: "Falta cometida", pontos: -0.3 },
  { scout: "impedimentos", label: "Impedimento", pontos: -0.1 },
  { scout: "amarelos", label: "Cartão amarelo", pontos: -1 },
  { scout: "vermelhos", label: "Cartão vermelho", pontos: -3 },
  { scout: "penaltis_cometidos", label: "Pênalti cometido", pontos: -1 },
  { scout: "penaltis_perdidos", label: "Pênalti perdido", pontos: -4 },
  { scout: "gols_contra", label: "Gol contra", pontos: -3 },
];

/** Regras do cálculo que a tabela sozinha não mostra (`fn_pontuar_jogo`). */
export const SCORING_NOTES = [
  "Finalização no gol conta só os chutes que não viraram gol; o gol já vale +8,0.",
  "Jogo sem sofrer gol exige pelo menos 60 minutos em campo.",
  "Quem não entrou em campo, ou teve o jogo adiado, soma 0.",
];

/** "+8,0", "−0,3": sinal explícito e o caractere de menos tipográfico. */
export function formatScoringPoints(pontos: number) {
  const value = Math.abs(pontos).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${pontos < 0 ? "−" : "+"}${value}`;
}
