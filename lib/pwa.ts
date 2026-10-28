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

/** No iOS só o Safari instala apps da web; Chrome, Firefox e apps com navegador embutido não. */
export function isIosSafari(userAgent: string) {
  return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|Instagram|FBAN|FBAV|Line\//i.test(userAgent);
}

export function isStandalone(matchesStandalone: boolean, navigatorStandalone?: boolean) {
  return matchesStandalone || navigatorStandalone === true;
}

export type InstallInviteState = {
  standalone: boolean;
  platform: InstallPlatform;
  iosSafari: boolean;
  hasInstallPrompt: boolean;
  dismissedAt: number | null;
  now: number;
};

/**
 * O que oferecer: o prompt nativo (Android/Chrome), as instruções manuais
 * do Safari no iOS ou nada (já instalado, dispensado há pouco ou sem suporte).
 */
export function installInviteMode(state: InstallInviteState): "prompt" | "ios" | null {
  if (state.standalone) return null;
  if (state.dismissedAt !== null && state.now - state.dismissedAt < INSTALL_INVITE_COOLDOWN_DAYS * 86_400_000) return null;
  if (state.hasInstallPrompt) return "prompt";
  if (state.platform === "ios" && state.iosSafari) return "ios";
  return null;
}

export function parseDismissedAt(value: string | null): number | null {
  const time = Number(value);
  return value && Number.isFinite(time) && time > 0 ? time : null;
}
