"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import {
  detectIosBrowser,
  detectPlatform,
  INSTALL_INVITE_DISMISSED_KEY,
  type InstallInviteMode,
  installInviteMode,
  type IosBrowser,
  isStandalone,
  parseDismissedAt,
} from "@/lib/pwa";

/** Evento do Chrome/Android que permite abrir o prompt nativo de instalação depois. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function readDismissedAt() {
  try {
    return parseDismissedAt(window.localStorage.getItem(INSTALL_INVITE_DISMISSED_KEY));
  } catch {
    return null;
  }
}

function saveDismissedAt() {
  try {
    window.localStorage.setItem(INSTALL_INVITE_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Sem armazenamento, o convite volta na próxima visita.
  }
}

/** Primeiro passo no iOS: onde fica o Compartilhar em cada navegador. */
const SHARE_STEP: Record<Exclude<IosBrowser, "embutido">, ReactNode> = {
  safari: <>Toque em <strong className="text-foreground">Compartilhar</strong> na barra do Safari (ou em ··· e depois Compartilhar).</>,
  chrome: <>Toque em <strong className="text-foreground">Compartilhar</strong> na barra de endereço do Chrome.</>,
  edge: <>Toque no menu <strong className="text-foreground">···</strong> do Edge e depois em <strong className="text-foreground">Compartilhar</strong>.</>,
  firefox: <>Abra o menu do Firefox e toque em <strong className="text-foreground">Compartilhar</strong>.</>,
};

/** Espaço extra no fim da página enquanto o convite fixo estiver visível, para ele não cobrir conteúdo. */
const BODY_SPACING_CLASS = "pb-20";

/**
 * Convite para instalar o app, fixo acima da navbar em todas as telas do app
 * até ser fechado ou o app ser instalado (JOA-77, JOA-156, JOA-159, JOA-162).
 */
export function InstallInvite() {
  const [mode, setMode] = useState<InstallInviteMode | null>(null);
  const [iosBrowser, setIosBrowser] = useState<IosBrowser>("safari");
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null);
  const sheet = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const platform = detectPlatform(userAgent, navigator.maxTouchPoints);
    const browser = platform === "ios" ? detectIosBrowser(userAgent) : null;
    if (browser) setIosBrowser(browser);
    const base = {
      standalone: isStandalone(
        window.matchMedia("(display-mode: standalone)").matches,
        (navigator as Navigator & { standalone?: boolean }).standalone,
      ),
      platform,
      iosBrowser: browser,
      dismissedAt: readDismissedAt(),
    };
    setMode(installInviteMode({ ...base, hasInstallPrompt: false, now: Date.now() }));

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      promptEvent.current = event as BeforeInstallPromptEvent;
      setMode(installInviteMode({ ...base, hasInstallPrompt: true, now: Date.now() }));
    };
    const onInstalled = () => setMode(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!mode) return;
    document.body.classList.add(BODY_SPACING_CLASS);
    return () => document.body.classList.remove(BODY_SPACING_CLASS);
  }, [mode]);

  if (!mode) return null;

  const dismiss = () => {
    saveDismissedAt();
    sheet.current?.close();
    setMode(null);
  };

  const install = async () => {
    if (mode === "ios") {
      sheet.current?.showModal();
      return;
    }
    const event = promptEvent.current;
    if (!event) return;
    promptEvent.current = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "dismissed") dismiss();
    else setMode(null);
  };

  return (
    <>
      <aside aria-label="Instalar o app" className="mb-3 flex items-center gap-3 rounded-2xl border border-border bg-secondary px-3.5 py-3 shadow-lg">
        <Download className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="grid flex-1">
          <strong className="text-sm font-bold">Instale o Escalou</strong>
          <span className="text-xs text-muted-foreground">
            {mode === "abrir-no-navegador"
              ? "Abra este link no Safari ou no Chrome para instalar o Escalou."
              : "Abra direto da tela inicial, em tela cheia."}
          </span>
        </div>
        {mode !== "abrir-no-navegador" && (
          <button type="button" onClick={install} className="h-9 rounded-xl bg-primary px-3.5 text-sm font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Instalar
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label="Dispensar convite para instalar" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" aria-hidden="true" />
        </button>
      </aside>

      <dialog
        ref={sheet}
        aria-labelledby="install-sheet-title"
        onClick={(event) => { if (event.target === event.currentTarget) event.currentTarget.close(); }}
        className="mx-auto mb-0 mt-auto w-full max-w-lg rounded-t-3xl border-0 bg-card p-0 text-foreground backdrop:bg-black/70"
      >
        <div className="grid gap-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
          <span className="mx-auto h-1 w-10 rounded-full bg-muted" aria-hidden="true" />
          <h2 id="install-sheet-title" className="text-lg font-extrabold">Adicionar à Tela de Início</h2>
          <ol className="grid gap-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Share className="size-[18px]" aria-hidden="true" /></span>
              <span>{SHARE_STEP[iosBrowser === "embutido" ? "safari" : iosBrowser]}</span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><SquarePlus className="size-[18px]" aria-hidden="true" /></span>
              <span>Escolha <strong className="text-foreground">Adicionar à Tela de Início</strong> e confirme em Adicionar.</span>
            </li>
          </ol>
          <button type="button" onClick={() => sheet.current?.close()} className="h-12 rounded-[14px] bg-primary text-base font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            Entendi
          </button>
        </div>
      </dialog>
    </>
  );
}
