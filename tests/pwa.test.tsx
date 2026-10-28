import { readFileSync } from "node:fs";
import path from "node:path";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import manifest from "@/app/manifest";
import { InstallInvite } from "@/components/page/home/install-invite";
import {
  detectPlatform,
  INSTALL_INVITE_COOLDOWN_DAYS,
  INSTALL_INVITE_DISMISSED_KEY,
  installInviteMode,
  isIosSafari,
  isStandalone,
  parseDismissedAt,
} from "@/lib/pwa";

const IPHONE_SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID_CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

const DAY = 86_400_000;
const base = { standalone: false, platform: "android" as const, iosSafari: false, hasInstallPrompt: true, dismissedAt: null, now: 100 * DAY };

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

  it("só considera instalável no iOS o Safari", () => {
    expect(isIosSafari(IPHONE_SAFARI)).toBe(true);
    expect(isIosSafari(IPHONE_CHROME)).toBe(false);
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

  it("mostra instruções manuais no Safari do iOS", () => {
    expect(installInviteMode({ ...base, platform: "ios", iosSafari: true, hasInstallPrompt: false })).toBe("ios");
    expect(installInviteMode({ ...base, platform: "ios", iosSafari: false, hasInstallPrompt: false })).toBeNull();
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

  it("dispensar esconde o convite e grava a data", () => {
    render(<InstallInvite />);
    act(() => { window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn(), userChoice: new Promise(() => undefined) })); });

    fireEvent.click(screen.getByRole("button", { name: "Dispensar convite para instalar" }));
    expect(screen.queryByRole("complementary", { name: "Instalar o app" })).toBeNull();
    expect(parseDismissedAt(window.localStorage.getItem(INSTALL_INVITE_DISMISSED_KEY))).not.toBeNull();
  });
});
