import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const savePushSubscription = vi.fn();
const removePushSubscription = vi.fn();
let pathname = "/";

vi.mock("lucide-react", () => ({ Bell: () => null, Loader2: () => null, X: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/app/perfil/actions", () => ({
  savePushSubscription: (value: unknown) => savePushSubscription(value),
  removePushSubscription: (endpoint: string) => removePushSubscription(endpoint),
}));

import { PushInvite } from "@/components/pwa/push-invite";
import { PushToggle } from "@/components/pwa/push-toggle";
import { PUSH_INVITE_DISMISSED_KEY, PUSH_TURNED_OFF_KEY } from "@/lib/pwa";

const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", toJSON: () => ({ endpoint: "json" }), unsubscribe: vi.fn() };
const pushManager = { getSubscription: vi.fn(), subscribe: vi.fn() };
const registration = { pushManager };
const requestPermission = vi.fn();
const notification: { permission: NotificationPermission; requestPermission: typeof requestPermission } = { permission: "default", requestPermission };

function mockBrowser(permission: NotificationPermission = "default") {
  notification.permission = permission;
  vi.stubGlobal("Notification", notification);
  vi.stubGlobal("PushManager", class {});
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: vi.fn().mockResolvedValue(registration), register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration) },
  });
}

const grantPermission = async (result: NotificationPermission = "granted") => {
  notification.permission = result;
  return result;
};

const toggleName = { name: "Notificação da rodada" };
const renderToggle = () => render(<PushToggle description="Avisos da rodada" vapidPublicKey="_-8" />);
const renderInvite = () => render(<PushInvite vapidPublicKey="_-8" />);
const allowButton = () => screen.findByRole("button", { name: "Permitir" });

beforeEach(() => {
  vi.clearAllMocks();
  pathname = "/";
  window.localStorage.clear();
  mockBrowser();
  pushManager.getSubscription.mockResolvedValue(null);
  pushManager.subscribe.mockImplementation(async () => {
    pushManager.getSubscription.mockResolvedValue(subscription);
    return subscription;
  });
  subscription.unsubscribe.mockImplementation(async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    return true;
  });
  savePushSubscription.mockResolvedValue(true);
  removePushSubscription.mockResolvedValue(true);
  requestPermission.mockImplementation(() => grantPermission());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PushInvite", () => {
  it("só pede permissão depois do toque e some ao ativar, junto com o interruptor", async () => {
    render(<><PushInvite vapidPublicKey="_-8" /><PushToggle description="Avisos da rodada" vapidPublicKey="_-8" /></>);
    const allow = await allowButton();
    expect(screen.getByRole("switch", toggleName)).toBeChecked();
    expect(requestPermission).not.toHaveBeenCalled();

    fireEvent.click(allow);

    await waitFor(() => expect(screen.queryByRole("button", { name: "Permitir" })).not.toBeInTheDocument());
    expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: new Uint8Array([255, 239]) });
    expect(savePushSubscription).toHaveBeenCalledWith({ endpoint: "json" });
    expect(screen.getByRole("switch", toggleName)).toBeChecked();
  });

  it("some e bloqueia o interruptor quando a permissão é recusada", async () => {
    requestPermission.mockImplementation(() => grantPermission("denied"));
    render(<><PushInvite vapidPublicKey="_-8" /><PushToggle description="Avisos da rodada" vapidPublicKey="_-8" /></>);
    fireEvent.click(await allowButton());

    expect(await screen.findByText(/notificações estão bloqueadas/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Permitir" })).not.toBeInTheDocument();
    expect(screen.getByRole("switch", toggleName)).not.toBeChecked();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("fica dispensado por 14 dias, menos no perfil", async () => {
    renderInvite();
    fireEvent.click(await screen.findByRole("button", { name: "Dispensar pedido de notificação" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Permitir" })).not.toBeInTheDocument());
    expect(window.localStorage.getItem(PUSH_INVITE_DISMISSED_KEY)).not.toBeNull();
    cleanup();

    renderInvite();
    await waitFor(() => expect(navigator.serviceWorker.getRegistration).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("button", { name: "Permitir" })).not.toBeInTheDocument();
    cleanup();

    pathname = "/perfil";
    renderInvite();
    expect(await allowButton()).toBeInTheDocument();
    cleanup();

    pathname = "/";
    window.localStorage.setItem(PUSH_INVITE_DISMISSED_KEY, String(Date.now() - 15 * 86_400_000));
    renderInvite();
    expect(await allowButton()).toBeInTheDocument();
  });

  it("não aparece para quem desligou, nem antes de terminar de entrar", async () => {
    pathname = "/onboarding";
    renderInvite();
    await waitFor(() => expect(navigator.serviceWorker.getRegistration).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Permitir" })).not.toBeInTheDocument();
    cleanup();

    pathname = "/";
    window.localStorage.setItem(PUSH_TURNED_OFF_KEY, "1");
    renderInvite();
    await waitFor(() => expect(navigator.serviceWorker.getRegistration).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("button", { name: "Permitir" })).not.toBeInTheDocument();
  });

  it("desfaz a inscrição do navegador quando o servidor não salva", async () => {
    savePushSubscription.mockResolvedValue(false);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderInvite();
    fireEvent.click(await allowButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível alterar");
    expect(subscription.unsubscribe).toHaveBeenCalled();
    log.mockRestore();
  });

  it("explica quando o navegador não alcança o serviço de push", async () => {
    pushManager.subscribe.mockRejectedValue(new DOMException("Registration failed - push service error", "AbortError"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderInvite();
    fireEvent.click(await allowButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("não conseguiu se conectar ao serviço de notificações");
    expect(savePushSubscription).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("PushToggle", () => {
  it("inscreve sozinho quando o aparelho já permitiu", async () => {
    mockBrowser("granted");
    renderToggle();

    await waitFor(() => expect(savePushSubscription).toHaveBeenCalledWith({ endpoint: "json" }));
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("respeita quem desligou, mesmo com a permissão concedida", async () => {
    mockBrowser("granted");
    window.localStorage.setItem(PUSH_TURNED_OFF_KEY, "1");
    renderToggle();

    await screen.findByText("Avisos da rodada");
    expect(screen.getByRole("switch", toggleName)).not.toBeChecked();
    expect(pushManager.subscribe).not.toHaveBeenCalled();
  });

  it("volta a ligar pelo interruptor e esquece o desligamento", async () => {
    window.localStorage.setItem(PUSH_TURNED_OFF_KEY, "1");
    renderToggle();
    await screen.findByText("Avisos da rodada");

    fireEvent.click(screen.getByRole("switch", toggleName));

    await waitFor(() => expect(screen.getByRole("switch", toggleName)).toBeChecked());
    expect(window.localStorage.getItem(PUSH_TURNED_OFF_KEY)).toBeNull();
  });

  it("desliga removendo primeiro do servidor e lembra a escolha", async () => {
    pushManager.getSubscription.mockResolvedValue(subscription);
    renderToggle();
    await screen.findByText("Avisos da rodada");
    fireEvent.click(screen.getByRole("switch", toggleName));

    await waitFor(() => expect(subscription.unsubscribe).toHaveBeenCalled());
    expect(removePushSubscription).toHaveBeenCalledWith(subscription.endpoint);
    await waitFor(() => expect(screen.getByRole("switch", toggleName)).not.toBeChecked());
    expect(window.localStorage.getItem(PUSH_TURNED_OFF_KEY)).toBe("1");
  });

  it("orienta quem está em um navegador sem push", async () => {
    vi.stubGlobal("PushManager", undefined);
    Reflect.deleteProperty(window, "PushManager");
    renderToggle();
    expect(await screen.findByText(/No iPhone, instale o Escalou/)).toBeInTheDocument();
    expect(screen.getByRole("switch", toggleName)).not.toBeChecked();
  });
});
