"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics/client";

export function ShareRecapButton({ text, url }: { text: string; url: string | null }) {
  const [status, setStatus] = useState<string | null>(null);

  async function share() {
    setStatus(null);
    const payload = { title: "Escalou", text, ...(url ? { url } : {}) };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
        trackEvent("fim_rodada_compartilhado", { metodo: "nativo" });
        return;
      }
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
      setStatus("Resumo copiado. É só colar no grupo.");
      trackEvent("fim_rodada_compartilhado", { metodo: "copiado" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Não foi possível compartilhar agora.");
    }
  }

  return <div className="grid gap-2">
    <button
      type="button"
      onClick={share}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Share2 className="size-4" aria-hidden="true" />
      Compartilhar resumo
    </button>
    <p aria-live="polite" className="min-h-4 text-center text-xs text-muted-foreground">{status}</p>
  </div>;
}
