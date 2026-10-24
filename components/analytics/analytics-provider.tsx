"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics/client";

/** Liga o PostHog quando `NEXT_PUBLIC_POSTHOG_KEY` está configurada; caso contrário não faz nada. */
export function AnalyticsProvider({ userId }: { userId: string | null }) {
  useEffect(() => {
    initAnalytics(userId);
  }, [userId]);
  return null;
}
