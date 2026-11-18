"use client";

import { useState, useTransition } from "react";
import { Presentation } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { setDemoMode } from "./actions";

const label = "Modo demonstração";

/** Opção do próprio admin: mostra o seletor de demonstração em Início e Meu time. */
export function DemoModeToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(checked: boolean) {
    setFailure(null);
    setEnabled(checked);
    startTransition(async () => {
      const result = await setDemoMode(checked);
      if (!result.ok) {
        setEnabled(!checked);
        setFailure(result.error);
      }
    });
  }

  return <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
    <div className="flex min-h-8 items-center gap-3">
      <Presentation className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span id="modo-demonstracao" className="min-w-0 flex-1 text-[15px] font-semibold">{label}</span>
      <Switch aria-labelledby="modo-demonstracao" checked={enabled} disabled={pending} onCheckedChange={toggle} />
    </div>
    <p className="m-0 mt-2 pl-8 text-sm leading-snug text-muted-foreground">
      {enabled
        ? "Ligado: Início e Meu time mostram os dados de exemplo para apresentar o app."
        : "Desligado: Início e Meu time mostram a rodada real."}
    </p>
    {failure && <p role="alert" className="m-0 mt-2 pl-8 text-sm font-semibold text-destructive">{failure}</p>}
  </section>;
}
