"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics/client";
import { detectPlatform, isStandalone, PWA_INSTALLED_TRACKED_KEY } from "@/lib/pwa";

/** Lê e grava no localStorage sem quebrar em navegação privada ou com armazenamento bloqueado. */
function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Registra o service worker (só em produção, para não interferir no dev server)
 * e envia `pwa_instalado` uma vez por aparelho.
 */
export function PwaSetup() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
    const trackOnce = (origem: "appinstalled" | "standalone") => {
      const store = storage();
      if (store?.getItem(PWA_INSTALLED_TRACKED_KEY)) return;
      // Aguarda o AnalyticsProvider inicializar o PostHog no mesmo ciclo de efeitos.
      window.setTimeout(() => {
        if (!trackEvent("pwa_instalado", { origem, plataforma: platform })) return;
        try {
          store?.setItem(PWA_INSTALLED_TRACKED_KEY, origem);
        } catch {
          // Sem armazenamento, o evento pode se repetir; é melhor do que não registrar.
        }
      }, 0);
    };

    const standalone = isStandalone(
      window.matchMedia("(display-mode: standalone)").matches,
      (navigator as Navigator & { standalone?: boolean }).standalone,
    );
    if (standalone) trackOnce("standalone");

    const onInstalled = () => trackOnce("appinstalled");
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  return null;
}
