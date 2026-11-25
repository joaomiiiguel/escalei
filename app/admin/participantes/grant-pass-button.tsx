"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { grantPasses } from "../actions";

type GrantPassButtonProps = {
  userId: string;
  nickname: string;
  /** Passes disponíveis hoje; `null` quando a contagem não pôde ser lida. */
  initialAvailable: number | null;
};

/** Célula de passes do painel: mostra o saldo e concede 1 passe por clique. */
export function GrantPassButton({ userId, nickname, initialAvailable }: GrantPassButtonProps) {
  const [available, setAvailable] = useState(initialAvailable);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function grant() {
    setFailure(null);
    startTransition(async () => {
      const result = await grantPasses(userId, 1);
      if (result.ok) setAvailable(result.available);
      else setFailure(result.error);
    });
  }

  return <div className="flex flex-col items-end gap-1">
    <div className="flex items-center justify-end gap-2">
      <span className="font-bold tabular-nums" aria-live="polite">{available ?? "—"}</span>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        aria-label={`Adicionar 1 passe para ${nickname}`}
        title="Adicionar 1 passe"
        loading={pending}
        onClick={grant}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
    {failure && <p role="alert" className="m-0 text-xs font-semibold text-destructive">{failure}</p>}
  </div>;
}
