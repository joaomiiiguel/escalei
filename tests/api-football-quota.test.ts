import { describe, expect, it, vi } from "vitest";
import {
  ApiAccessError,
  ApiFootballClient,
  availableRequests,
  blockingApiError,
  crossedUsageLevel,
  describeApiErrors,
  finishSyncExecution,
  parseRemaining,
  QuotaReservedError,
  remainingReadingValidSince,
  startOfQuotaDay,
  startSyncExecution,
  type Budget,
} from "@/supabase/functions/_shared/api-football";

function apiResponse(remaining: number | null, body: unknown = { errors: [], response: [] }) {
  const headers = new Headers({ "content-type": "application/json" });
  if (remaining !== null) headers.set("x-ratelimit-requests-remaining", String(remaining));
  return new Response(JSON.stringify(body), { status: 200, headers });
}

const budget = (usedToday: number, limit = 7500, reserve = 500): Budget => ({ limit, reserve, usedToday });

/** Simula o encadeamento do supabase-js usado por `startSyncExecution`/`finishSyncExecution`. */
function fakeDb({ usedToday = 0, lastKnownRemaining = null as number | null, config = [] as Array<{ chave: string; valor: unknown }> } = {}) {
  const inserted: unknown[] = [];
  const updated: unknown[] = [];
  const filters: unknown[][] = [];
  const chain = {
    select: () => chain,
    gte: (...args: unknown[]) => { filters.push(args); return chain; },
    not: () => chain,
    order: () => chain,
    limit: () => chain,
    in: async () => ({ data: config }),
    eq: async () => ({ error: null }),
    maybeSingle: async () => ({ data: lastKnownRemaining === null ? null : { cota_restante: lastKnownRemaining } }),
    single: async () => ({ data: { id: 7 }, error: null }),
    insert: (row: unknown) => { inserted.push(row); return chain; },
    update: (row: unknown) => { updated.push(row); return chain; },
  };
  const rpc = vi.fn(async () => ({ data: usedToday, error: null }));
  return { db: { from: () => chain, rpc } as never, inserted, updated, rpc, filters };
}

describe("orçamento diário da API-Football", () => {
  it("lê a cota diária restante do cabeçalho", () => {
    expect(parseRemaining(new Headers({ "x-ratelimit-requests-remaining": "42" }))).toBe(42);
    expect(parseRemaining(new Headers())).toBeNull();
    expect(parseRemaining(new Headers({ "x-ratelimit-requests-remaining": "abc" }))).toBeNull();
  });

  it("usa a virada do dia em UTC", () => {
    expect(startOfQuotaDay(new Date("2026-10-24T02:30:00-03:00"))).toBe("2026-10-24T00:00:00.000Z");
  });

  it("calcula quantas requisições ainda cabem antes da reserva", () => {
    expect(availableRequests(budget(0))).toBe(7000);
    expect(availableRequests(budget(6999))).toBe(1);
    expect(availableRequests(budget(7200))).toBe(0);
  });

  it("conta requisições e atualiza a cota restante", async () => {
    const fetchFn = vi.fn(async () => apiResponse(6000));
    const client = new ApiFootballClient("chave", null, budget(10), fetchFn);
    const { payload } = await client.get("/fixtures?id=1");
    expect(payload.response).toEqual([]);
    expect(client.requests).toBe(1);
    expect(client.usedToday).toBe(11);
    expect(client.remaining).toBe(6000);
    expect(fetchFn).toHaveBeenCalledWith("https://v3.football.api-sports.io/fixtures?id=1", expect.objectContaining({ headers: expect.objectContaining({ "x-apisports-key": "chave" }) }));
  });

  it("bloqueia sem chamar a API quando o consumo do dia chega à reserva, mesmo com o cabeçalho otimista", async () => {
    const fetchFn = vi.fn(async () => apiResponse(5000));
    const client = new ApiFootballClient("chave", 5000, budget(6999, 7500, 500), fetchFn);
    await client.get("/fixtures?id=1");
    await expect(client.get("/fixtures?id=2")).rejects.toBeInstanceOf(QuotaReservedError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("também bloqueia quando o cabeçalho da API informa cota na reserva", async () => {
    const client = new ApiFootballClient("chave", 400, budget(0), vi.fn());
    await expect(client.get("/status")).rejects.toThrow(/a API informa 400 restantes/);
  });

  it("mantém a última cota conhecida quando a API não envia o cabeçalho", async () => {
    const client = new ApiFootballClient("chave", 5000, budget(0), async () => apiResponse(null));
    await client.get("/status");
    expect(client.remaining).toBe(5000);
  });
});

describe("erros devolvidos pela API", () => {
  it("resume os erros em uma linha", () => {
    expect(describeApiErrors({ errors: { plan: "Free plans do not have access to this season", token: "x" } })).toBe("plan: Free plans do not have access to this season | token: x");
    expect(describeApiErrors({ errors: ["falhou"] })).toBe("falhou");
    expect(describeApiErrors({ errors: [] })).toBeNull();
    expect(describeApiErrors({})).toBeNull();
  });

  it("interrompe ao receber chave inválida ou limite atingido", async () => {
    expect(blockingApiError({ errors: { token: "Error/Missing application key." } })).toBeInstanceOf(ApiAccessError);
    expect(blockingApiError({ errors: { requests: "You have reached the request limit for the day" } })).toBeInstanceOf(QuotaReservedError);
    expect(blockingApiError({ errors: { plan: "Free plans do not have access to this season" } })).toBeNull();
    const client = new ApiFootballClient("chave", null, budget(0), async () => apiResponse(null, { errors: { token: "Error/Missing application key." }, response: [] }));
    await expect(client.get("/status")).rejects.toThrow("A API-Football recusou o acesso: Error/Missing application key.");
  });
});

describe("avisos de consumo", () => {
  it("avisa ao cruzar 50% e 80% do limite", () => {
    expect(crossedUsageLevel(3700, 3751, 7500)).toBe(0.5);
    expect(crossedUsageLevel(5990, 6010, 7500)).toBe(0.8);
    expect(crossedUsageLevel(3700, 6100, 7500)).toBe(0.8);
    expect(crossedUsageLevel(100, 200, 7500)).toBeNull();
  });
});

describe("registro da execução", () => {
  it("usa o limite e a reserva de `configuracoes` e o consumo do dia", async () => {
    const { db, inserted, updated, rpc } = fakeDb({
      usedToday: 79,
      config: [{ chave: "api_football_limite_diario", valor: 100 }, { chave: "api_football_reserva_diaria", valor: 20 }],
    });
    const execution = await startSyncExecution(db, "chave", "PONTUACAO", "api-football:fixture-1", { now: new Date("2026-10-27T12:00:00Z"), fetchFn: async () => apiResponse(null) });
    expect(rpc).toHaveBeenCalledWith("fn_requisicoes_api_football", { p_desde: "2026-10-27T00:00:00.000Z" });
    expect(inserted).toEqual([expect.objectContaining({ tipo: "PONTUACAO", referencia: "api-football:fixture-1", sucesso: false })]);
    await execution.client.get("/fixtures/players?fixture=1");
    await expect(execution.client.get("/fixtures/events?fixture=1")).rejects.toBeInstanceOf(QuotaReservedError);
    const log = vi.fn();
    await finishSyncExecution(db, execution, "reserva", log);
    expect(updated).toEqual([expect.objectContaining({ requisicoes: 1, sucesso: false, erro: "reserva" })]);
    expect(log).toHaveBeenCalledWith("[api-football] Consumo do dia passou de 80%: 80 de 100 requisições.");
  });

  it("usa 7.500 e 500 quando não há configuração", async () => {
    const { db } = fakeDb({ usedToday: 6999 });
    const execution = await startSyncExecution(db, "chave", "JOGO", "teste", { fetchFn: async () => apiResponse(null) });
    await execution.client.get("/fixtures?ids=1");
    await expect(execution.client.get("/fixtures?ids=2")).rejects.toBeInstanceOf(QuotaReservedError);
  });
});

describe("leitura recente da cota", () => {
  it("considera só leituras dos últimos 10 minutos do mesmo dia UTC", () => {
    expect(remainingReadingValidSince(new Date("2026-10-27T12:00:00Z"))).toBe("2026-10-27T11:50:00.000Z");
    expect(remainingReadingValidSince(new Date("2026-10-27T00:05:00Z"))).toBe("2026-10-27T00:00:00.000Z");
  });

  it("busca a última cota informada pela API só entre as leituras recentes", async () => {
    const { db, filters } = fakeDb();
    await startSyncExecution(db, "chave", "RODADA", "teste", { now: new Date("2026-10-27T18:00:00Z"), fetchFn: async () => apiResponse(null) });
    expect(filters).toContainEqual(["terminado_em", "2026-10-27T17:50:00.000Z"]);
  });

  it("não regrava a cota herdada quando a execução é barrada, para o bloqueio não se renovar", async () => {
    const { db, updated } = fakeDb({ lastKnownRemaining: 99 });
    const execution = await startSyncExecution(db, "chave", "PONTUACAO", "teste", { fetchFn: vi.fn() });
    await expect(execution.client.get("/fixtures/players?fixture=1")).rejects.toBeInstanceOf(QuotaReservedError);
    await finishSyncExecution(db, execution, "reserva", vi.fn());
    expect(updated).toEqual([expect.objectContaining({ requisicoes: 0, cota_restante: null })]);
  });

  it("grava a cota lida da resposta da API nesta execução", async () => {
    const { db, updated } = fakeDb({ lastKnownRemaining: 99 });
    const execution = await startSyncExecution(db, "chave", "RODADA", "teste", { fetchFn: async () => apiResponse(7400) });
    execution.client.remaining = null; // leitura antiga descartada pela janela de 10 minutos
    await execution.client.get("/fixtures?ids=1");
    await finishSyncExecution(db, execution, undefined, vi.fn());
    expect(updated).toEqual([expect.objectContaining({ requisicoes: 1, cota_restante: 7400, sucesso: true })]);
  });
});
