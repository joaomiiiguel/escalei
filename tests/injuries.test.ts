import { describe, expect, it } from "vitest";
import {
  type ApiInjury,
  buildPlayerStatuses,
  injuriesSyncDue,
  injuryStatus,
  INJURIES_RETRY_MS,
} from "@/supabase/functions/_shared/injuries";
import recording from "./fixtures/api-football/2026/rodada-33/injuries.json";
import emptyRecording from "./fixtures/api-football/2026/rodada-34/injuries.json";

const HOUR = 3_600_000;

describe("status a partir de /injuries", () => {
  it("cartões viram suspensão com o motivo em português", () => {
    expect(injuryStatus("Missing Fixture", "Red Card")).toEqual({ status: "SUSPENSO", motivo: "Expulso" });
    expect(injuryStatus("Missing Fixture", "Yellow Cards")).toEqual({ status: "SUSPENSO", motivo: "3º amarelo" });
    expect(injuryStatus("Missing Fixture", "Suspended")).toEqual({ status: "SUSPENSO", motivo: "Suspenso" });
  });

  it("desfalque por lesão vira Lesionado, com motivo traduzido ou genérico", () => {
    expect(injuryStatus("Missing Fixture", "Muscle Injury")).toEqual({ status: "LESIONADO", motivo: "Lesão muscular" });
    expect(injuryStatus("Missing Fixture", "Knee Injury")).toEqual({ status: "LESIONADO", motivo: "Lesão no joelho" });
    expect(injuryStatus("Missing Fixture", "Wrist Injury")).toEqual({ status: "LESIONADO", motivo: "Lesão" });
  });

  it("incerto ou inativo vira Dúvida, sem bloquear a escalação", () => {
    expect(injuryStatus("Questionable", "Muscle Injury")).toEqual({ status: "DUVIDA", motivo: "Lesão muscular" });
    expect(injuryStatus("Missing Fixture", "Inactive")).toEqual({ status: "DUVIDA", motivo: "Inativo" });
    expect(injuryStatus("Questionable", "Inactive")).toEqual({ status: "DUVIDA", motivo: "Inativo" });
  });

  it("ignora tipos desconhecidos", () => {
    expect(injuryStatus("Outro", "Injury")).toBeNull();
    expect(injuryStatus(null, null)).toBeNull();
  });
});

describe("rodada 33 real", () => {
  const injuries = recording.response as ApiInjury[];
  const statuses = buildPlayerStatuses(injuries);

  it("um status por jogador, mesmo com a API repetindo os registros", () => {
    const distinct = new Set(injuries.map((injury) => injury.player?.id));
    expect(injuries.length).toBe(218);
    expect(statuses).toHaveLength(distinct.size);
    expect(new Set(statuses.map((item) => item.api_football_id)).size).toBe(statuses.length);
  });

  it("separa suspensos, lesionados e dúvidas", () => {
    const count = (status: string) => statuses.filter((item) => item.status === status).length;
    expect(count("SUSPENSO")).toBeGreaterThan(0);
    expect(count("LESIONADO")).toBeGreaterThan(0);
    expect(count("DUVIDA")).toBeGreaterThan(0);
    expect(count("SUSPENSO") + count("LESIONADO") + count("DUVIDA")).toBe(statuses.length);
    expect(statuses.filter((item) => item.status === "SUSPENSO").every((item) => ["Expulso", "3º amarelo", "Suspenso"].includes(item.motivo))).toBe(true);
  });

  it("o mais grave prevalece quando o mesmo jogador aparece duas vezes", () => {
    const player = { id: 1, type: "Questionable", reason: "Injury" };
    expect(buildPlayerStatuses([{ player }, { player: { ...player, type: "Missing Fixture", reason: "Red Card" } }])).toEqual([
      { api_football_id: 1, status: "SUSPENSO", motivo: "Expulso" },
    ]);
  });

  it("rodada sem desfalques publicados devolve lista vazia", () => {
    expect(buildPlayerStatuses(emptyRecording.response as ApiInjury[])).toEqual([]);
  });
});

describe("quando consultar", () => {
  const abre = new Date("2026-11-01T03:00:00Z");
  const trava = new Date("2026-11-02T22:00:00Z");
  const round = { status: "ABERTA", abre_em: abre.toISOString(), trava_em: trava.toISOString() };
  const at = (ms: number) => new Date(ms);
  const none = { lastSuccessAt: null, lastAttemptAt: null };
  const ok = (ms: number) => ({ lastSuccessAt: at(ms).toISOString(), lastAttemptAt: at(ms).toISOString() });

  it("só com a rodada aberta e antes da trava", () => {
    expect(injuriesSyncDue(round, none, at(abre.getTime() + HOUR))).toBe(true);
    expect(injuriesSyncDue({ ...round, status: "AGENDADA" }, none, at(abre.getTime() + HOUR))).toBe(false);
    expect(injuriesSyncDue({ ...round, status: "EM_ANDAMENTO" }, none, at(trava.getTime() + HOUR))).toBe(false);
    expect(injuriesSyncDue(round, none, trava)).toBe(false);
  });

  it("consulta de novo depois da abertura, a cada 6 h", () => {
    const start = abre.getTime() + HOUR;
    expect(injuriesSyncDue(round, ok(abre.getTime() - HOUR), at(start))).toBe(true);
    expect(injuriesSyncDue(round, ok(start), at(start + 5 * HOUR))).toBe(false);
    expect(injuriesSyncDue(round, ok(start), at(start + 6 * HOUR))).toBe(true);
  });

  it("faz uma última consulta nas 2 h antes da trava", () => {
    const lastCall = trava.getTime() - 2 * HOUR;
    expect(injuriesSyncDue(round, ok(lastCall - HOUR), at(lastCall - 1))).toBe(false);
    expect(injuriesSyncDue(round, ok(lastCall - HOUR), at(lastCall))).toBe(true);
    expect(injuriesSyncDue(round, ok(lastCall + 1), at(lastCall + HOUR))).toBe(false);
  });

  it("espera antes de repetir uma tentativa que falhou", () => {
    const failedAt = abre.getTime() + HOUR;
    const history = { lastSuccessAt: null, lastAttemptAt: at(failedAt).toISOString() };
    expect(injuriesSyncDue(round, history, at(failedAt + 2 * 60_000))).toBe(false);
    expect(injuriesSyncDue(round, history, at(failedAt + INJURIES_RETRY_MS))).toBe(true);
  });
});
