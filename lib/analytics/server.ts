import { after } from "next/server";
import { posthogConfig, type AnalyticsEventName, type AnalyticsEvents } from "./events";

type FetchFn = typeof fetch;

/** Envia um evento ao PostHog pela API de captura. Sem chave configurada, não faz nada. */
export async function sendServerEvent<E extends AnalyticsEventName>(
  distinctId: string,
  event: E,
  properties: AnalyticsEvents[E],
  fetchFn: FetchFn = fetch,
): Promise<boolean> {
  const config = posthogConfig();
  if (!config) return false;
  try {
    const response = await fetchFn(`${config.host}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: config.key, event, distinct_id: distinctId, properties: { ...properties, $lib: "escalou-server" } }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Agenda o envio para depois da resposta, sem atrasar redirecionamentos de Server Actions. */
export function trackServerEvent<E extends AnalyticsEventName>(distinctId: string, event: E, properties: AnalyticsEvents[E]) {
  if (!posthogConfig()) return;
  after(() => sendServerEvent(distinctId, event, properties).then(() => undefined));
}
