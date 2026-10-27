import { describe, expect, it } from "vitest";
import { buildCalendar, gameRow, initialRoundStatus, lockBefore, openingAfter, roundNumber, type ApiFixture } from "@/supabase/functions/_shared/calendar";
import fixtures from "./fixtures/api-football/2026/fixtures.json";

const all = fixtures.response as ApiFixture[];

describe("calendário oficial 2026 (resposta real da API)", () => {
  const calendar = buildCalendar(all, 33);

  it("registra só as rodadas 33 a 38", () => {
    expect(calendar.map((round) => round.numero)).toEqual([33, 34, 35, 36, 37, 38]);
    expect(calendar.every((round) => round.fixtures.length === 10)).toBe(true);
  });

  it("abre a 33 à meia-noite de Fortaleza após o último jogo da 32 e trava 1 h antes do primeiro jogo", () => {
    // Último jogo da 32: 26/10 23:00 UTC (20:00 em Fortaleza) → abre 27/10 00:00 em Fortaleza (03:00 UTC).
    // Primeiro jogo da 33: 28/10 22:30 UTC → trava 21:30 UTC.
    expect(calendar[0]).toMatchObject({ numero: 33, rotulo_api: "Regular Season - 33", abre_em: "2026-10-27T03:00:00.000Z", trava_em: "2026-10-28T21:30:00.000Z" });
  });

  it("toda rodada abre antes de travar", () => {
    expect(calendar.every((round) => round.abre_em < round.trava_em)).toBe(true);
  });

  it("monta as linhas de jogos com os clubes do catálogo", () => {
    const fixture = calendar[0].fixtures[0];
    const clubIdByApiId = new Map([[fixture.teams.home.id, 10], [fixture.teams.away.id, 20]]);
    expect(gameRow(fixture, { rodadaId: 3, clubIdByApiId, now: "agora" })).toMatchObject({
      id: 1_500_000_000 + fixture.fixture.id,
      api_football_id: fixture.fixture.id,
      rodada_id: 3,
      clube_casa_id: 10,
      clube_fora_id: 20,
      status: "A_JOGAR",
    });
    expect(() => gameRow(fixture, { rodadaId: 3, clubIdByApiId: new Map(), now: "agora" })).toThrow(/sincronize o catálogo/);
  });
});

describe("regras de horário", () => {
  it("lê o número da rodada só da fase regular", () => {
    expect(roundNumber("Regular Season - 7")).toBe(7);
    expect(roundNumber("Final")).toBeNull();
  });

  it("calcula a meia-noite de Fortaleza do dia seguinte, inclusive quando o jogo termina depois da meia-noite UTC", () => {
    expect(openingAfter(new Date("2026-10-30T23:00:00Z")).toISOString()).toBe("2026-10-31T03:00:00.000Z");
    expect(openingAfter(new Date("2026-10-31T01:30:00Z")).toISOString()).toBe("2026-10-31T03:00:00.000Z");
    expect(lockBefore(new Date("2026-10-28T22:30:00Z")).toISOString()).toBe("2026-10-28T21:30:00.000Z");
  });

  it("ignora jogos adiados para definir horários", () => {
    const base = all.filter((fixture) => fixture.league.round === "Regular Season - 33").slice(0, 2);
    const postponed = { ...base[0], fixture: { ...base[0].fixture, date: "2026-10-01T10:00:00+00:00", status: { short: "PST" } } };
    const [round] = buildCalendar([postponed, base[1]], 33);
    expect(round.trava_em).toBe(lockBefore(new Date(base[1].fixture.date)).toISOString());
  });

  it("define a situação inicial da rodada pelo momento atual", () => {
    const opens = new Date("2026-10-27T03:00:00Z");
    const locks = new Date("2026-10-28T21:30:00Z");
    expect(initialRoundStatus(opens, locks, new Date("2026-10-26T12:00:00Z"))).toBe("AGENDADA");
    expect(initialRoundStatus(opens, locks, new Date("2026-10-27T18:00:00Z"))).toBe("ABERTA");
    expect(initialRoundStatus(opens, locks, new Date("2026-10-28T22:00:00Z"))).toBe("EM_ANDAMENTO");
  });
});
