/**
 * Cliente compartilhado da API-Football com registro em `sync_execucoes`
 * e guarda de cota diária.
 *
 * - Cada execução de Edge Function registra uma linha em `sync_execucoes`
 *   com o número de requisições, a cota restante informada pela API e o erro.
 * - Antes de cada chamada, o cliente verifica a última cota conhecida do dia
 *   (UTC, quando a API zera o contador). Se ela já estiver na reserva diária,
 *   a chamada é bloqueada com `QuotaReservedError`, sem gastar requisição.
 *
 * Este módulo não usa globais do Deno para poder ser testado com Vitest.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

/** Requisições diárias reservadas para correções manuais e conferências. */
export const DAILY_QUOTA_RESERVE = 15;

/** Cabeçalho da API-Football com as requisições restantes no dia. */
const DAILY_REMAINING_HEADER = "x-ratelimit-requests-remaining";

export type SyncType = "RODADA" | "JOGO" | "PONTUACAO" | "ORQUESTRADOR";

export class QuotaReservedError extends Error {
  constructor(readonly remaining: number) {
    super(`Cota diária da API-Football na reserva (${remaining} restantes).`);
    this.name = "QuotaReservedError";
  }
}

export function parseRemaining(headers: Headers): number | null {
  const value = headers.get(DAILY_REMAINING_HEADER);
  if (value === null || value.trim() === "") return null;
  const remaining = Number(value);
  return Number.isInteger(remaining) && remaining >= 0 ? remaining : null;
}

/** Início do dia em UTC, quando a API-Football renova a cota. */
export function startOfQuotaDay(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

/** Envelope das respostas da API-Football; `errors` vem como objeto ou lista. */
export type ApiFootballPayload = { response?: unknown; errors?: object };

export class ApiFootballClient {
  requests = 0;

  constructor(
    private readonly apiKey: string,
    public remaining: number | null,
    private readonly fetchFn: FetchFn = fetch,
    private readonly reserve = DAILY_QUOTA_RESERVE,
  ) {}

  /** Faz um GET em `path` (ex.: `/fixtures?id=1`) respeitando a reserva diária. */
  async get(path: string): Promise<{ response: Response; payload: ApiFootballPayload }> {
    if (this.remaining !== null && this.remaining <= this.reserve) throw new QuotaReservedError(this.remaining);
    this.requests += 1;
    const response = await this.fetchFn(`${API_FOOTBALL_BASE_URL}${path}`, {
      headers: { "x-apisports-key": this.apiKey, Accept: "application/json" },
    });
    this.remaining = parseRemaining(response.headers) ?? this.remaining;
    const payload = await response.json().catch(() => ({})) as ApiFootballPayload;
    return { response, payload };
  }
}

export type SyncExecution = { id: number; client: ApiFootballClient };

/** Registra o início de uma execução e devolve um cliente com a última cota conhecida do dia. */
export async function startSyncExecution(
  db: SupabaseClient,
  apiKey: string,
  tipo: SyncType,
  referencia: string,
  options: { now?: Date; fetchFn?: FetchFn } = {},
): Promise<SyncExecution> {
  const now = options.now ?? new Date();
  const { data: lastKnown } = await db
    .from("sync_execucoes")
    .select("cota_restante")
    .gte("iniciado_em", startOfQuotaDay(now))
    .not("cota_restante", "is", null)
    .order("iniciado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: execution, error } = await db
    .from("sync_execucoes")
    .insert({ tipo, referencia, iniciado_em: now.toISOString(), requisicoes: 0, sucesso: false })
    .select("id")
    .single();
  if (error || !execution) throw new Error("Não foi possível registrar a sincronização.");
  const remaining = typeof lastKnown?.cota_restante === "number" ? lastKnown.cota_restante : null;
  return { id: execution.id, client: new ApiFootballClient(apiKey, remaining, options.fetchFn) };
}

/** Fecha a execução com requisições, cota restante e erro (quando houver). */
export async function finishSyncExecution(db: SupabaseClient, execution: SyncExecution, error?: string): Promise<void> {
  await db.from("sync_execucoes").update({
    terminado_em: new Date().toISOString(),
    requisicoes: execution.client.requests,
    cota_restante: execution.client.remaining,
    sucesso: !error,
    erro: error ?? null,
  }).eq("id", execution.id);
}
