"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";
import type { AnalyticsEventName, AnalyticsEvents } from "@/lib/analytics/events";

/** Registra um evento uma vez quando a tela é exibida (para uso em Server Components). */
export function TrackEvent<E extends AnalyticsEventName>({ event, properties }: { event: E; properties: AnalyticsEvents[E] }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    // Aguarda o provider inicializar o PostHog no mesmo ciclo de efeitos.
    const timer = window.setTimeout(() => trackEvent(event, properties), 0);
    return () => window.clearTimeout(timer);
  }, [event, properties]);
  return null;
}
