import { describe, expect, it, vi } from "vitest";
import {
  ApiFootballClient,
  DAILY_QUOTA_RESERVE,
  finishSyncExecution,
  parseRemaining,
  QuotaReservedError,
  startOfQuotaDay,
  startSyncExecution,
} from "@/supabase/functions/_shared/api-football";

function apiResponse(remaining: number | null, body: unknown = { response: [] }) {
  const headers = new Headers({ "content-type": "application/json" });
  if (remaining !== null) headers.set("x-ratelimit-requests-remaining", String(remaining));
  return new Response(JSON.stringify(body), { status: 200, headers });
}

/** Simula o encadeamento do supabase-js para a tabela `sync_execucoes`. */
function fakeDb(lastKnownRemaining: number | null) {
  const inserted: unknown[] = [];
  const updated: unknown[] = [];
  const chain = {
    select: () => chain,
    gte: () => chain,
    not: () => chain,
    order: () => chain,
    limit: () => chain,
    eq: async () => ({ error: null }),
    maybeSingle: async () => ({ data: lastKnownRemaining === null ? null : { cota_restante: lastKnownRemaining } }),
    single: async () => ({ data: { id: 7 }, error: null }),
    insert: (row: unknown) => { inserted.push(row); return chain; },
    update: (row: unknown) => { updated.push(row); return chain; },
  };
  return { db: { from: () => chain } as never, inserted, updated };
}

describe("guarda de cota da API-Football", () => {
  it("lê a cota diária restante do cabeçalho", () => {
    expect(parseRemaining(new Headers({ "x-ratelimit-requests-remaining": "42" }))).toBe(42);
    expect(parseRemaining(new Headers())).toBeNull();
    expect(parseRemaining(new Headers({ "x-ratelimit-requests-remaining": "abc" }))).toBeNull();
  });

  it("usa a virada do dia em UTC", () => {
    expect(startOfQuotaDay(new Date("2026-10-24T02:30:00-03:00"))).toBe("2026-10-24T00:00:00.000Z");
  });

  it("conta requisições e atualiza a cota restante", async () => {
    const fetchFn = vi.fn(async () => apiResponse(80));
    const client = new ApiFootballClient("chave", null, fetchFn);
    const { payload } = await client.get("/fixtures?id=1");
    expect(payload).toEqual({ response: [] });
    expect(client.requests).toBe(1);
    expect(client.remaining).toBe(80);
    expect(fetchFn).toHaveBeenCalledWith("https://v3.football.api-sports.io/fixtures?id=1", expect.objectContaining({ headers: expect.objectContaining({ "x-apisports-key": "chave" }) }));
  });

  it(`bloqueia chamadas quando restam ${DAILY_QUOTA_RESERVE} requisições ou menos`, async () => {
    const fetchFn = vi.fn(async () => apiResponse(DAILY_QUOTA_RESERVE));
    const client = new ApiFootballClient("chave", DAILY_QUOTA_RESERVE + 1, fetchFn);
    await client.get("/fixtures?id=1");
    await expect(client.get("/fixtures?id=2")).rejects.toBeInstanceOf(QuotaReservedError);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(client.requests).toBe(1);
  });

  it("mantém a última cota conhecida quando a API não envia o cabeçalho", async () => {
    const client = new ApiFootballClient("chave", 50, async () => apiResponse(null));
    await client.get("/status");
    expect(client.remaining).toBe(50);
  });

  it("inicia a execução com a última cota conhecida do dia e registra o resultado", async () => {
    const { db, inserted, updated } = fakeDb(10);
    const execution = await startSyncExecution(db, "chave", "PONTUACAO", "api-football:fixture-1", { fetchFn: async () => apiResponse(9) });
    expect(inserted).toEqual([expect.objectContaining({ tipo: "PONTUACAO", referencia: "api-football:fixture-1", sucesso: false })]);
    await expect(execution.client.get("/fixtures/players?fixture=1")).rejects.toBeInstanceOf(QuotaReservedError);
    await finishSyncExecution(db, execution, "reserva");
    expect(updated).toEqual([expect.objectContaining({ requisicoes: 0, cota_restante: 10, sucesso: false, erro: "reserva" })]);
  });
});
