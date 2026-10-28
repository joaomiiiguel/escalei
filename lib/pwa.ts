/**
 * Regras do convite para instalar o app (PWA). Funções puras para poderem
 * ser testadas sem navegador; o componente cliente só lê o ambiente e aplica.
 */
export type InstallPlatform = "ios" | "android" | "outro";

/** Depois de dispensado, o convite volta a aparecer só após este intervalo. */
export const INSTALL_INVITE_COOLDOWN_DAYS = 14;
export const INSTALL_INVITE_DISMISSED_KEY = "escalou_convite_instalar_dispensado_em";
export const PWA_INSTALLED_TRACKED_KEY = "escalou_pwa_instalado_registrado";

/** iPadOS se apresenta como Mac; o toque múltiplo o distingue de um Mac de verdade. */
export function detectPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "outro";
}

/**
 * Navegador no iOS. Desde o iOS 16.4, Safari, Chrome, Edge e Firefox adicionam
 * à Tela de Início pelo menu Compartilhar; navegadores embutidos em outros apps
 * (Instagram, Facebook, Google App etc.) não instalam (JOA-162).
 */
export type IosBrowser = "safari" | "chrome" | "edge" | "firefox" | "embutido";

const IOS_IN_APP = /Instagram|FBAN|FBAV|FBIOS|Line\/|GSA\/|Twitter|LinkedInApp|musical_ly|BytedanceWebview|OPiOS|DuckDuckGo/i;

export function detectIosBrowser(userAgent: string): IosBrowser {
  if (IOS_IN_APP.test(userAgent)) return "embutido";
  if (/EdgiOS/i.test(userAgent)) return "edge";
  if (/CriOS/i.test(userAgent)) return "chrome";
  if (/FxiOS/i.test(userAgent)) return "firefox";
  // WebViews de outros apps costumam omitir "Version/" e "Safari/".
  if (/Version\/[\d.]+.*Safari\//i.test(userAgent)) return "safari";
  return "embutido";
}

export function isStandalone(matchesStandalone: boolean, navigatorStandalone?: boolean) {
  return matchesStandalone || navigatorStandalone === true;
}

export type InstallInviteState = {
  standalone: boolean;
  platform: InstallPlatform;
  /** Só no iOS; `null` nas demais plataformas. */
  iosBrowser: IosBrowser | null;
  hasInstallPrompt: boolean;
  dismissedAt: number | null;
  now: number;
};

export type InstallInviteMode = "prompt" | "ios" | "abrir-no-navegador";

/**
 * O que oferecer: o prompt nativo (Android/Chrome), as instruções manuais
 * do iOS, o aviso para sair do navegador embutido de outro app, ou nada
 * (já instalado, dispensado há pouco ou sem suporte).
 */
export function installInviteMode(state: InstallInviteState): InstallInviteMode | null {
  if (state.standalone) return null;
  if (state.dismissedAt !== null && state.now - state.dismissedAt < INSTALL_INVITE_COOLDOWN_DAYS * 86_400_000) return null;
  if (state.hasInstallPrompt) return "prompt";
  if (state.platform === "ios" && state.iosBrowser) return state.iosBrowser === "embutido" ? "abrir-no-navegador" : "ios";
  return null;
}

export function parseDismissedAt(value: string | null): number | null {
  const time = Number(value);
  return value && Number.isFinite(time) && time > 0 ? time : null;
}
