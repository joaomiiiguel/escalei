import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import { InstallInvite } from "@/components/pwa/install-invite";
import { Navbar } from "@/components/ui/navbar";
import {
  detectIosBrowser,
  detectPlatform,
  INSTALL_INVITE_COOLDOWN_DAYS,
  INSTALL_INVITE_DISMISSED_KEY,
  installInviteMode,
  isStandalone,
  parseDismissedAt,
} from "@/lib/pwa";

const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
const IPHONE_EDGE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/130.0.2849.80 Mobile/15E148 Safari/605.1.15";
const IPHONE_FIREFOX = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15";
const IPHONE_INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.31.104 (iPhone15,2; iOS 18_0; pt_BR; pt; scale=3.00; 1179x2556; 642000000)";
const IPHONE_FACEBOOK = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.40.108;FBBV/650000000;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/18.0;FBSS/3;FBID/phone;FBLC/pt_BR;FBOP/5]";
const IPHONE_GOOGLE_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/340.0.689826579 Mobile/15E148 Safari/604.1";
const IPHONE_WEBVIEW = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPAD_DESKTOP_MODE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

const DAY = 86_400_000;
const base = { standalone: false, platform: "android" as const, iosBrowser: null, hasInstallPrompt: true, dismissedAt: null, now: 100 * DAY };

describe("manifest", () => {
  const data = manifest();

  it("abre em tela cheia a partir da raiz, com as cores do app", () => {
    expect(data).toMatchObject({ short_name: "Escalou", lang: "pt-BR", start_url: "/", scope: "/", display: "standalone", theme_color: "#050505", background_color: "#050505" });
  });

  it("declara ícones 192, 512 e maskable que existem em public/", () => {
    const icons = data.icons ?? [];
    expect(icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual(["192x192 any", "512x512 any", "512x512 maskable"]);
    for (const icon of icons) expect(() => readFileSync(path.join("public", icon.src))).not.toThrow();
  });
});

describe("service worker", () => {
  const sw = readFileSync("public/sw.js", "utf8");

  it("guarda em cache só a página offline e o ícone dela", () => {
    expect(sw).toContain('const OFFLINE_ASSETS = ["/offline.html", "/icons/icon-192.png"]');
    expect(sw).not.toMatch(/cache\.put/);
  });

  it("a página offline existe e está em português", () => {
    expect(readFileSync("public/offline.html", "utf8")).toMatch(/<html lang="pt-BR">[\s\S]*Sem conexão/);
  });
});

describe("plataforma", () => {
  it("reconhece iPhone, iPad em modo desktop e Android", () => {
    expect(detectPlatform(IPHONE_SAFARI)).toBe("ios");
    expect(detectPlatform(IPAD_DESKTOP_MODE, 5)).toBe("ios");
    expect(detectPlatform(IPAD_DESKTOP_MODE, 0)).toBe("outro");
    expect(detectPlatform(ANDROID_CHROME)).toBe("android");
  });

  it("reconhece os navegadores do iOS que instalam", () => {
    expect(detectIosBrowser(IPHONE_SAFARI)).toBe("safari");
    expect(detectIosBrowser(IPAD_DESKTOP_MODE)).toBe("safari");
    expect(detectIosBrowser(IPHONE_CHROME)).toBe("chrome");
    expect(detectIosBrowser(IPHONE_EDGE)).toBe("edge");
    expect(detectIosBrowser(IPHONE_FIREFOX)).toBe("firefox");
  });

  it("trata navegadores embutidos em outros apps como não instaláveis", () => {
    for (const userAgent of [IPHONE_INSTAGRAM, IPHONE_FACEBOOK, IPHONE_GOOGLE_APP, IPHONE_WEBVIEW]) {
      expect(detectIosBrowser(userAgent), userAgent).toBe("embutido");
    }
  });

  it("detecta o app aberto pela tela inicial", () => {
    expect(isStandalone(true)).toBe(true);
    expect(isStandalone(false, true)).toBe(true);
    expect(isStandalone(false)).toBe(false);
  });
});

describe("convite para instalar", () => {
  it("usa o prompt nativo quando o navegador oferece", () => {
    expect(installInviteMode(base)).toBe("prompt");
  });

  it("mostra instruções manuais no Safari, Chrome, Edge e Firefox do iOS", () => {
    for (const iosBrowser of ["safari", "chrome", "edge", "firefox"] as const) {
      expect(installInviteMode({ ...base, platform: "ios", iosBrowser, hasInstallPrompt: false })).toBe("ios");
    }
  });

  it("pede para abrir no Safari ou no Chrome quando está num navegador embutido", () => {
    expect(installInviteMode({ ...base, platform: "ios", iosBrowser: "embutido", hasInstallPrompt: false })).toBe("abrir-no-navegador");
  });

  it("o aviso de navegador embutido também respeita instalação e intervalo", () => {
    const ios = { ...base, platform: "ios" as const, iosBrowser: "embutido" as const, hasInstallPrompt: false };
    expect(installInviteMode({ ...ios, standalone: true })).toBeNull();
    expect(installInviteMode({ ...ios, dismissedAt: ios.now - DAY })).toBeNull();
  });

  it("some quando o app já está instalado ou sem suporte", () => {
    expect(installInviteMode({ ...base, standalone: true })).toBeNull();
    expect(installInviteMode({ ...base, platform: "outro", hasInstallPrompt: false })).toBeNull();
  });

  it("respeita o intervalo depois de dispensado", () => {
    const now = base.now;
    expect(installInviteMode({ ...base, dismissedAt: now - DAY })).toBeNull();
    expect(installInviteMode({ ...base, dismissedAt: now - INSTALL_INVITE_COOLDOWN_DAYS * DAY })).toBe("prompt");
  });

  it("ignora valores inválidos no armazenamento", () => {
    expect(parseDismissedAt(null)).toBeNull();
    expect(parseDismissedAt("abc")).toBeNull();
    expect(parseDismissedAt("1700000000000")).toBe(1_700_000_000_000);
  });
});

describe("InstallInvite", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });
  afterEach(cleanup);

  it("aparece com o beforeinstallprompt e abre o prompt nativo", async () => {
    render(<InstallInvite />);
    expect(screen.queryByRole("complementary", { name: "Instalar o app" })).toBeNull();

    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) });
    act(() => { window.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);

    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Instalar" })); });
    expect(prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole("complementary", { name: "Instalar o app" })).toBeNull();
  });

  it("reserva espaço no fim da página só enquanto o convite está visível", () => {
    render(<InstallInvite />);
    expect(document.body.classList.contains("pb-20")).toBe(false);
    act(() => { window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn(), userChoice: new Promise(() => undefined) })); });
    expect(document.body.classList.contains("pb-20")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Dispensar convite para instalar" }));
    expect(document.body.classList.contains("pb-20")).toBe(false);
  });

  it("dispensar esconde o convite e grava a data", () => {
    render(<InstallInvite />);
    act(() => { window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn(), userChoice: new Promise(() => undefined) })); });

    fireEvent.click(screen.getByRole("button", { name: "Dispensar convite para instalar" }));
    expect(screen.queryByRole("complementary", { name: "Instalar o app" })).toBeNull();
    expect(parseDismissedAt(window.localStorage.getItem(INSTALL_INVITE_DISMISSED_KEY))).not.toBeNull();
  });
});

describe("InstallInvite no iPhone", () => {
  const originalUserAgent = navigator.userAgent;
  const setUserAgent = (value: string) => Object.defineProperty(window.navigator, "userAgent", { value, configurable: true });

  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
  });
  afterEach(() => {
    cleanup();
    setUserAgent(originalUserAgent);
  });

  it.each([
    ["Safari", IPHONE_SAFARI, /na barra do Safari/],
    ["Chrome", IPHONE_CHROME, /na barra de endereço do Chrome/],
    ["Edge", IPHONE_EDGE, /menu ··· do Edge/],
    ["Firefox", IPHONE_FIREFOX, /menu do Firefox/],
  ])("no %s mostra o convite e os passos do próprio navegador", (_name, userAgent, step) => {
    setUserAgent(userAgent);
    render(<InstallInvite />);
    expect(screen.getByRole("complementary", { name: "Instalar o app" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Instalar" }));
    const sheet = screen.getByRole("dialog", { name: "Adicionar à Tela de Início" });
    expect(sheet.textContent).toMatch(step);
    expect(sheet.textContent).toMatch(/Adicionar à Tela de Início e confirme/);
  });

  it.each([["Instagram", IPHONE_INSTAGRAM], ["Facebook", IPHONE_FACEBOOK]])("no %s pede para abrir no Safari ou no Chrome, sem botão de instalar", (_name, userAgent) => {
    setUserAgent(userAgent);
    render(<InstallInvite />);
    const invite = screen.getByRole("complementary", { name: "Instalar o app" });
    expect(invite.textContent).toContain("Abra este link no Safari ou no Chrome para instalar o Escalou.");
    expect(screen.queryByRole("button", { name: "Instalar" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Dispensar convite para instalar" }));
    expect(screen.queryByRole("complementary", { name: "Instalar o app" })).toBeNull();
    expect(parseDismissedAt(window.localStorage.getItem(INSTALL_INVITE_DISMISSED_KEY))).not.toBeNull();
  });

  it("não aparece no iPhone com o app já instalado", () => {
    setUserAgent(IPHONE_CHROME);
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    render(<InstallInvite />);
    expect(screen.queryByRole("complementary", { name: "Instalar o app" })).toBeNull();
  });
});

describe("convite na navbar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });
  afterEach(cleanup);

  it("fica na pilha fixa do rodapé, acima da navegação", () => {
    const { container } = render(<Navbar />);
    act(() => { window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn(), userChoice: new Promise(() => undefined) })); });
    const stack = container.querySelector("[data-app-navbar]")!;
    const invite = screen.getByRole("complementary", { name: "Instalar o app" });
    expect(stack.contains(invite)).toBe(true);
    expect(stack.firstElementChild).toBe(invite);
    expect(stack.className).toContain("fixed");
  });
});
