import { ChevronDown, ChevronUp, Minus } from "lucide-react";
import type { PositionChange } from "@/lib/league-ranking";

function label(change: PositionChange) {
  if (change.direction === "same") return "Manteve a posição da rodada anterior";
  const places = `${change.places} ${change.places === 1 ? "posição" : "posições"}`;
  return change.direction === "up" ? `Subiu ${places} em relação à rodada anterior` : `Desceu ${places} em relação à rodada anterior`;
}

/** Indicador ▲/▼ da variação de posição no ranking em relação à rodada anterior. */
export function PositionChangeIndicator({ change }: { change: PositionChange | null }) {
  if (!change) return <span className="w-8" aria-hidden="true" />;
  const tone = change.direction === "up" ? "text-success" : change.direction === "down" ? "text-red-400" : "text-muted-foreground";
  const Icon = change.direction === "up" ? ChevronUp : change.direction === "down" ? ChevronDown : Minus;
  return <span className={`flex w-8 items-center justify-center gap-0.5 text-xs font-extrabold font-mono ${tone}`} title={label(change)}>
    <Icon className="size-3.5" aria-hidden="true" />
    {change.places > 0 && <span aria-hidden="true">{change.places}</span>}
    <span className="sr-only">{label(change)}</span>
  </span>;
}
