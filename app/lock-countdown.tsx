"use client";

import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

function remaining(travaEm: string) {
  const total = Math.max(0, Math.floor((new Date(travaEm).getTime() - Date.now()) / 1000));
  return {
    dias: Math.floor(total / 86_400),
    horas: Math.floor((total % 86_400) / 3_600),
    minutos: Math.floor((total % 3_600) / 60),
    segundos: total % 60,
  };
}

export function LockCountdown({ travaEm, formattedDate }: { travaEm: string; formattedDate: string }) {
  const [time, setTime] = useState<{ dias: number; horas: number; minutos: number; segundos: number } | null>(null);

  useEffect(() => {
    setTime(remaining(travaEm));
    const interval = window.setInterval(() => setTime(remaining(travaEm)), 1_000);
    return () => window.clearInterval(interval);
  }, [travaEm]);

  const parts = [[time?.dias ?? 0, "dia"], [time?.horas ?? 0, "horas"], [time?.minutos ?? 0, "min"], [time?.segundos ?? 0, "seg"]] as const;
  return <section className="flex flex-col justify-around h-full rounded-2xl bg-card p-4" aria-label="Tempo até a trava da escalação">
    <div className="flex items-center gap-1.5 text-sm">
      <Lock className="size-4 text-warning" aria-hidden="true" />
      <span className="flex-1 font-semibold text-muted-foreground">Escalação trava em</span>
      <time className="font-bold text-foreground" dateTime={travaEm}>{formattedDate}</time>
    </div>
    <div className="mt-4 grid grid-cols-4 gap-2">
      {parts.map(([value, label]) => (
        <div className="rounded-[10px] bg-card-foreground py-2 text-center" key={label}>
          <strong className="block text-2xl font-extrabold leading-none tabular-nums text-foreground">
            {String(value).padStart(2, "0")}
          </strong>
          <span className="mt-1 block text-[11px] text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  </section>;
}
