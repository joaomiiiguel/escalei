/**
 * Calendário oficial a partir de `/fixtures?league=&season=` da API-Football.
 *
 * Regras de horário (Ativação de Produção — Calendário e Orquestração), no
 * fuso America/Fortaleza (UTC−3, sem horário de verão), gravadas em UTC:
 * - `abre_em`: 00:00 do dia seguinte ao último jogo da rodada anterior;
 * - `trava_em`: 1 hora antes do primeiro jogo da rodada.
 * Jogos adiados, suspensos ou cancelados não definem esses horários.
 *
 * Este módulo não usa globais do Deno para poder ser testado com Vitest.
 */

export type GameStatus = "A_JOGAR" | "EM_ANDAMENTO" | "ENCERRADO" | "ADIADO" | "CANCELADO";
export type RoundStatus = "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA";

export type ApiFixture = {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string };
  teams: { home: { id: number }; away: { id: number } };
  goals?: { home: number | null; away: number | null };
};

export const GAME_ID_OFFSET = 1_500_000_000;
const FORTALEZA_OFFSET_HOURS = -3;
const LOCK_BEFORE_FIRST_GAME_MINUTES = 60;

export const STATUS_BY_API: Record<string, GameStatus> = {
  TBD: "A_JOGAR", NS: "A_JOGAR",
  "1H": "EM_ANDAMENTO", HT: "EM_ANDAMENTO", "2H": "EM_ANDAMENTO", ET: "EM_ANDAMENTO", BT: "EM_ANDAMENTO", P: "EM_ANDAMENTO", INT: "EM_ANDAMENTO", LIVE: "EM_ANDAMENTO",
  FT: "ENCERRADO", AET: "ENCERRADO", PEN: "ENCERRADO",
  PST: "ADIADO", SUSP: "ADIADO",
  CANC: "CANCELADO", ABD: "CANCELADO", AWD: "CANCELADO", WO: "CANCELADO",
};

/** Número da rodada em rótulos como "Regular Season - 33"; `null` para outras fases. */
export function roundNumber(label: string): number | null {
  const match = /^Regular Season - (\d{1,2})$/.exec(label.trim());
  return match ? Number(match[1]) : null;
}

const isInterrupted = (fixture: ApiFixture) => ["ADIADO", "CANCELADO"].includes(STATUS_BY_API[fixture.fixture.status.short] ?? "");

/** 00:00 em Fortaleza do dia seguinte a `lastGame`, em UTC. */
export function openingAfter(lastGame: Date): Date {
  const local = new Date(lastGame.getTime() + FORTALEZA_OFFSET_HOURS * 3_600_000);
  const nextLocalMidnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  return new Date(nextLocalMidnight - FORTALEZA_OFFSET_HOURS * 3_600_000);
}

export function lockBefore(firstGame: Date): Date {
  return new Date(firstGame.getTime() - LOCK_BEFORE_FIRST_GAME_MINUTES * 60_000);
}

/** Situação inicial de uma rodada recém-registrada. */
export function initialRoundStatus(opensAt: Date, locksAt: Date, now: Date): RoundStatus {
  if (now < opensAt) return "AGENDADA";
  if (now < locksAt) return "ABERTA";
  return "EM_ANDAMENTO";
}

export type CalendarRound = {
  numero: number;
  rotulo_api: string;
  abre_em: string;
  trava_em: string;
  fixtures: ApiFixture[];
};

/**
 * Rodadas a partir de `fromRound` (as anteriores ficam fora do campeonato do
 * app), com horários de abertura e trava. Rodadas sem jogos com data válida
 * ainda não entram.
 */
export function buildCalendar(fixtures: ApiFixture[], fromRound: number): CalendarRound[] {
  const byRound = new Map<number, ApiFixture[]>();
  for (const fixture of fixtures) {
    const numero = roundNumber(fixture.league.round);
    if (numero === null) continue;
    byRound.set(numero, [...(byRound.get(numero) ?? []), fixture]);
  }
  const times = (round: ApiFixture[]) => round.filter((fixture) => !isInterrupted(fixture)).map((fixture) => new Date(fixture.fixture.date).getTime()).filter(Number.isFinite);
  return [...byRound.keys()].filter((numero) => numero >= fromRound).sort((a, b) => a - b).flatMap((numero) => {
    const roundFixtures = byRound.get(numero)!;
    const own = times(roundFixtures);
    const previous = times(byRound.get(numero - 1) ?? []);
    if (!own.length) return [];
    const locksAt = lockBefore(new Date(Math.min(...own)));
    const opensAt = previous.length ? openingAfter(new Date(Math.max(...previous))) : new Date(locksAt.getTime() - 3 * 86_400_000);
    // Rodadas encavaladas: a escalação precisa abrir antes da trava.
    const safeOpensAt = opensAt < locksAt ? opensAt : new Date(locksAt.getTime() - 12 * 3_600_000);
    return [{
      numero,
      rotulo_api: roundFixtures[0].league.round,
      abre_em: safeOpensAt.toISOString(),
      trava_em: locksAt.toISOString(),
      fixtures: roundFixtures,
    }];
  });
}

/** Linha de `jogos` para um jogo da API (status e placar só valem na criação). */
export function gameRow(fixture: ApiFixture, options: { id?: number; rodadaId: number; clubIdByApiId: Map<number, number>; now: string }) {
  const status = STATUS_BY_API[fixture.fixture.status.short];
  if (!status) throw new Error(`Status da API-Football sem mapeamento: ${fixture.fixture.status.short}.`);
  const home = options.clubIdByApiId.get(fixture.teams.home.id);
  const away = options.clubIdByApiId.get(fixture.teams.away.id);
  if (!home || !away) throw new Error(`Clube do jogo ${fixture.fixture.id} não está no catálogo; sincronize o catálogo antes do calendário.`);
  return {
    id: options.id ?? GAME_ID_OFFSET + fixture.fixture.id,
    api_football_id: fixture.fixture.id,
    rodada_id: options.rodadaId,
    clube_casa_id: home,
    clube_fora_id: away,
    inicio_em: fixture.fixture.date,
    status,
    status_api: fixture.fixture.status.short,
    gols_casa: fixture.goals?.home ?? null,
    gols_fora: fixture.goals?.away ?? null,
    api_atualizado_em: options.now,
  };
}
