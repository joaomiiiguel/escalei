"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

type RoundOption = { id: number; numero: number; isCurrent: boolean };

export function RoundSelector({ leagueId, options, selectedRoundId }: { leagueId: string; options: RoundOption[]; selectedRoundId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const selectedRound = options.find((option) => option.id === selectedRoundId);

  return <Select value={String(selectedRoundId)} onValueChange={(value) => {
    if (!value) return;
    const selected = options.find((option) => option.id === Number(value));
    startTransition(() => {
      router.push(selected?.isCurrent ? `/ligas/${leagueId}` : `/ligas/${leagueId}?rodada=${value}`);
    });
  }}>
    <SelectTrigger size="sm" aria-label="Selecionar rodada do ranking" className="border border-primary/90 px-4 py-2 bg-secondary text-primary/70 disabled:opacity-70" disabled={isPending} aria-busy={isPending || undefined}>
      <span>{isPending ? "Carregando..." : `Rodada ${String(selectedRound?.numero ?? "").padStart(2, "0")}`}</span>
    </SelectTrigger>
    <SelectContent align="end">
      {options.map((option) => <SelectItem key={option.id} value={String(option.id)}>Rodada {String(option.numero).padStart(2, "0")}{option.isCurrent ? " · atual" : ""}</SelectItem>)}
    </SelectContent>
  </Select>;
}
