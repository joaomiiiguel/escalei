import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_POSTHOG_HOST, hoursSince, posthogConfig } from "@/lib/analytics/events";

const afterMock = vi.fn();
vi.mock("next/server", () => ({ after: (task: () => unknown) => afterMock(task) }));

describe("configuração do PostHog", () => {
  it("fica desligada sem chave", () => {
    expect(posthogConfig({})).toBeNull();
    expect(posthogConfig({ NEXT_PUBLIC_POSTHOG_KEY: "  " })).toBeNull();
  });

  it("usa o host padrão e remove barra final de um host customizado", () => {
    expect(posthogConfig({ NEXT_PUBLIC_POSTHOG_KEY: "phc_teste" })).toEqual({ key: "phc_teste", host: DEFAULT_POSTHOG_HOST });
    expect(posthogConfig({ NEXT_PUBLIC_POSTHOG_KEY: "phc_teste", NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com/" })?.host).toBe("https://eu.i.posthog.com");
  });
});

describe("hoursSince", () => {
  const now = new Date("2026-10-25T22:30:00Z");

  it("conta horas inteiras desde o jogo encerrado mais recente", () => {
    expect(hoursSince(["2026-10-25T18:00:00Z", "2026-10-25T20:10:00Z", null], now)).toBe(2);
  });

  it("devolve null sem jogos encerrados", () => {
    expect(hoursSince([null, undefined], now)).toBeNull();
  });
});

describe("eventos do servidor", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    afterMock.mockReset();
  });

  it("não envia nada sem chave configurada", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { sendServerEvent, trackServerEvent } = await import("@/lib/analytics/server");
    const fetchFn = vi.fn();
    await expect(sendServerEvent("user-1", "convite_aceito", {}, fetchFn)).resolves.toBe(false);
    trackServerEvent("user-1", "convite_aceito", {});
    expect(fetchFn).not.toHaveBeenCalled();
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("envia o evento só com o id do usuário e as propriedades da métrica", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_teste");
    const { sendServerEvent } = await import("@/lib/analytics/server");
    const fetchFn = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    await expect(sendServerEvent("user-1", "time_escalado", { formacao: "4-3-3", segundos: 95, edicao: false }, fetchFn)).resolves.toBe(true);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(`${DEFAULT_POSTHOG_HOST}/i/v0/e/`);
    expect(JSON.parse(init.body)).toEqual({
      api_key: "phc_teste",
      event: "time_escalado",
      distinct_id: "user-1",
      properties: { formacao: "4-3-3", segundos: 95, edicao: false, $lib: "escalou-server" },
    });
  });

  it("agenda o envio para depois da resposta", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_teste");
    const { trackServerEvent } = await import("@/lib/analytics/server");
    trackServerEvent("user-1", "cadastro", { via_convite: true });
    expect(afterMock).toHaveBeenCalledTimes(1);
  });

  it("não quebra o fluxo quando o PostHog falha", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_teste");
    const { sendServerEvent } = await import("@/lib/analytics/server");
    await expect(sendServerEvent("user-1", "cadastro", { via_convite: false }, vi.fn().mockRejectedValue(new Error("offline")))).resolves.toBe(false);
  });
});
