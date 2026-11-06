"use client";

import { useEffect, useState } from "react";
import { countdownParts } from "@/lib/round-home";
import { scoreboard } from "@/components/ui/scoreboard";

/** Contagem regressiva do placar. `serverNow` mantém o primeiro render igual no servidor e no navegador. */
export function LockCountdown({ until, serverNow }: { until: string; serverNow: string }) {
  const [now, setNow] = useState(() => new Date(serverNow));

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, [until]);

  return (
    <p className={`${scoreboard} text-[clamp(56px,19vw,80px)] leading-[0.8] text-giz`} role="timer" aria-label="Tempo restante">
      {countdownParts(until, now).map(({ value, unit }) => (
        <span key={unit} className="mr-2.5 inline-block last:mr-0">
          {value}
          <span className="ml-0.5 font-(family-name:--font-body) text-lg font-bold text-giz/60">{unit}</span>
        </span>
      ))}
    </p>
  );
}
