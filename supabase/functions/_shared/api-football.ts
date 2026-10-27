/**
 * Cliente compartilhado da API-Football com registro em `sync_execucoes`
 * e orçamento diário de requisições.
 *
 * - Cada execução de Edge Function registra uma linha em `sync_execucoes`
 *   com o número de requisições, a cota restante informada pela API e o erro
 *   (incluindo a mensagem devolvida pela API).
 * - O orçamento é contado pelo próprio projeto: soma das requisições do dia
 *   (UTC, quando a API zera o contador) contra `api_football_limite_diario`
 *   menos `api_football_reserva_diaria`, lidos de `configuracoes`. O cabeçalho
 *   de cota da API é usado como segunda proteção.
 * - Erros de chave inválida ou de limite atingido devolvidos pela API
 *   interrompem a execução com `ApiAccessError` / `QuotaReservedError`.
 *
 * Este módulo não usa globais do Deno para poder ser testado com Vitest.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

/** Valores usados quando `configuracoes` não informa o orçamento. */
export const DEFAULT_DAILY_LIMIT = 7500;
export const DEFAULT_DAILY_RESERVE = 500;

/** Faixas de consumo do dia que geram aviso no log. */
export const USAGE_WARNING_LEVELS = [0.5, 0.8] as const;

/** Cabeçalho da API-Football com as requisições restantes no dia. */
const DAILY_REMAINING_HEADER = "x-ratelimit-requests-remaining";

export type SyncType = "RODADA" | "JOGO" | "PONTUACAO" | "ORQUESTRADOR";

export class QuotaReservedError extends Error {
  constructor(readonly detail: string) {
    super(`Orçamento diário da API-Football na reserva: ${detail}.`);
    this.name = "QuotaReservedError";
  }
}

/** A API recusou a chave ou o plano não dá acesso ao recurso pedido. */
export class ApiAccessError extends Error {
  constructor(readonly detail: string) {
    super(`A API-Football recusou o acesso: ${detail}`);
    this.name = "ApiAccessError";
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

/** Mensagens de erro devolvidas pela API, em uma linha, ou `null` sem erro. */
export function describeApiErrors(payload: ApiFootballPayload): string | null {
  const errors = payload.errors;
  if (!errors) return null;
  const entries = Array.isArray(errors)
    ? errors.map((value) => String(value))
    : Object.entries(errors).map(([key, value]) => `${key}: ${String(value)}`);
  return entries.length ? entries.join(" | ").slice(0, 500) : null;
}

/** Classifica erros da API que tornam inútil continuar chamando no mesmo dia. */
export function blockingApiError(payload: ApiFootballPayload): QuotaReservedError | ApiAccessError | null {
  const errors = payload.errors;
  if (!errors || Array.isArray(errors)) return null;
  const record = errors as Record<string, unknown>;
  if (record.requests || record.rateLimit) return new QuotaReservedError(String(record.requests ?? record.rateLimit));
  if (record.token || record.access) return new ApiAccessError(String(record.token ?? record.access));
  return null;
}

export type Budget = { limit: number; reserve: number; usedToday: number };

/** Requisições que ainda podem ser feitas hoje sem entrar na reserva. */
export function availableRequests(budget: Budget): number {
  return Math.max(0, budget.limit - budget.reserve - budget.usedToday);
}

/** Maior faixa de aviso (50%, 80%) cruzada ao passar de `before` para `after` requisições. */
export function crossedUsageLevel(before: number, after: number, limit: number): number | null {
  const crossed = USAGE_WARNING_LEVELS.filter((level) => before < level * limit && after >= level * limit);
  return crossed.length ? crossed[crossed.length - 1] : null;
}

export class ApiFootballClient {
  requests = 0;

  constructor(
    private readonly apiKey: string,
    public remaining: number | null,
    private readonly budget: Budget = { limit: DEFAULT_DAILY_LIMIT, reserve: DEFAULT_DAILY_RESERVE, usedToday: 0 },
    private readonly fetchFn: FetchFn = (input, init) => fetch(input, init),
  ) {}

  /** Requisições usadas no dia, contando as desta execução. */
  get usedToday() {
    return this.budget.usedToday + this.requests;
  }

  /** Faz um GET em `path` (ex.: `/fixtures?id=1`) respeitando o orçamento diário. */
  async get(path: string): Promise<{ response: Response; payload: ApiFootballPayload }> {
    if (this.requests >= availableRequests(this.budget)) {
      throw new QuotaReservedError(`${this.usedToday} de ${this.budget.limit} usadas hoje, reserva de ${this.budget.reserve}`);
    }
    if (this.remaining !== null && this.remaining <= this.budget.reserve) {
      throw new QuotaReservedError(`a API informa ${this.remaining} restantes`);
    }
    this.requests += 1;
    const response = await this.fetchFn(`${API_FOOTBALL_BASE_URL}${path}`, {
      headers: { "x-apisports-key": this.apiKey, Accept: "application/json" },
    });
    this.remaining = parseRemaining(response.headers) ?? this.remaining;
    const payload = await response.json().catch(() => ({})) as ApiFootballPayload;
    const blocking = blockingApiError(payload);
    if (blocking) throw blocking;
    return { response, payload };
  }
}

export type SyncExecution = { id: number; client: ApiFootballClient; limit: number };

function configNumber(rows: Array<{ chave: string; valor: unknown }> | null, key: string, fallback: number) {
  const value = Number(rows?.find((row) => row.chave === key)?.valor);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Registra o início de uma execução e devolve um cliente com o orçamento do dia. */
export async function startSyncExecution(
  db: SupabaseClient,
  apiKey: string,
  tipo: SyncType,
  referencia: string,
  options: { now?: Date; fetchFn?: FetchFn } = {},
): Promise<SyncExecution> {
  const now = options.now ?? new Date();
  const dayStart = startOfQuotaDay(now);
  const [{ data: config }, { data: usedToday, error: usageError }, { data: lastKnown }] = await Promise.all([
    db.from("configuracoes").select("chave, valor").in("chave", ["api_football_limite_diario", "api_football_reserva_diaria"]),
    db.rpc("fn_requisicoes_api_football", { p_desde: dayStart }),
    db.from("sync_execucoes")
      .select("cota_restante")
      .gte("iniciado_em", dayStart)
      .not("cota_restante", "is", null)
      .order("iniciado_em", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (usageError) throw new Error("Não foi possível consultar o consumo do dia da API-Football.");
  const { data: execution, error } = await db
    .from("sync_execucoes")
    .insert({ tipo, referencia, iniciado_em: now.toISOString(), requisicoes: 0, sucesso: false })
    .select("id")
    .single();
  if (error || !execution) throw new Error("Não foi possível registrar a sincronização.");
  const budget: Budget = {
    limit: configNumber(config, "api_football_limite_diario", DEFAULT_DAILY_LIMIT),
    reserve: configNumber(config, "api_football_reserva_diaria", DEFAULT_DAILY_RESERVE),
    usedToday: Number(usedToday ?? 0),
  };
  const remaining = typeof lastKnown?.cota_restante === "number" ? lastKnown.cota_restante : null;
  return { id: execution.id, client: new ApiFootballClient(apiKey, remaining, budget, options.fetchFn), limit: budget.limit };
}

/** Fecha a execução com requisições, cota restante e erro (quando houver). */
export async function finishSyncExecution(
  db: SupabaseClient,
  execution: SyncExecution,
  error?: string,
  log: (message: string) => void = console.warn,
): Promise<void> {
  const { client } = execution;
  const level = crossedUsageLevel(client.usedToday - client.requests, client.usedToday, execution.limit);
  if (level) log(`[api-football] Consumo do dia passou de ${level * 100}%: ${client.usedToday} de ${execution.limit} requisições.`);
  await db.from("sync_execucoes").update({
    terminado_em: new Date().toISOString(),
    requisicoes: client.requests,
    cota_restante: client.remaining,
    sucesso: !error,
    erro: error ? error.slice(0, 1000) : null,
  }).eq("id", execution.id);
}

/** Mensagem do erro para o log, preservando o detalhe devolvido pela API. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof QuotaReservedError || error instanceof ApiAccessError) return error.message;
  return fallback;
}
