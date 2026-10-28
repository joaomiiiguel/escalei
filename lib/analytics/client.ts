"use client";

import posthog from "posthog-js";
import { posthogConfig, type AnalyticsEventName, type AnalyticsEvents } from "./events";

let initialized = false;
let identifiedUserId: string | null = null;

/** Inicializa o PostHog no navegador, sem autocapture e sem dados pessoais. */
export function initAnalytics(userId: string | null) {
  const config = posthogConfig({
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  });
  if (!config || typeof window === "undefined") return false;
  if (!initialized) {
    posthog.init(config.key, {
      api_host: config.host,
      autocapture: false,
      capture_pageview: true,
      disable_session_recording: true,
      persistence: "localStorage",
      person_profiles: "identified_only",
    });
    initialized = true;
  }
  if (userId && identifiedUserId !== userId) posthog.identify(userId);
  if (!userId && identifiedUserId) posthog.reset();
  identifiedUserId = userId;
  return true;
}

/** Retorna `false` quando o PostHog não está configurado e o evento não foi enviado. */
export function trackEvent<E extends AnalyticsEventName>(event: E, properties: AnalyticsEvents[E]) {
  if (!initialized) return false;
  posthog.capture(event, properties);
  return true;
}
