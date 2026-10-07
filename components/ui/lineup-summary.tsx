import { WandSparkles } from "lucide-react";

type LineupSummaryProps = {
  budget?: number;
  selectedPlayers?: number;
  isSaving?: boolean;
  isAutoSelecting?: boolean;
  onAutoSelect?: () => void;
  onSave?: () => void;
  saveMessage?: string | null;
};

function formatCurrency(value: number) {
  return `C$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LineupSummary({ budget = 100, selectedPlayers = 0, isSaving = false, isAutoSelecting = false, onAutoSelect, onSave, saveMessage }: LineupSummaryProps) {
  const remainingSlots = Math.max(0, 11 - selectedPlayers);
  const averagePerSlot = remainingSlots ? budget / remainingSlots : 0;
  const canSave = selectedPlayers === 11 && budget >= 0;

  return <section className="grid gap-3 border-t border-border pt-3 " aria-label="Resumo da escalação">
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-medium text-muted-foreground">Restam</p>
        <p className="mt-0.5 text-md font-extrabold leading-none text-foreground">{formatCurrency(budget)}</p>
      </div>
      <div className="text-right">
        <p className="text-[11px] font-bold text-foreground">{selectedPlayers}/11 escalados</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Média {formatCurrency(averagePerSlot)} por vaga</p>
      </div>
    </div>

    <div className="grid grid-cols-11 gap-1" role="progressbar" aria-label="Progresso da escalação" aria-valuemin={0} aria-valuemax={11} aria-valuenow={selectedPlayers}>
      {Array.from({ length: 11 }, (_, index) => <span className={`h-1 rounded-full ${index < selectedPlayers ? "bg-primary" : "bg-muted"}`} key={index} />)}
    </div>

    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <button type="button" onClick={onAutoSelect} disabled={isAutoSelecting || isSaving} className="flex min-h-8 items-center justify-center gap-2 rounded-xl bg-muted px-4 text-sm font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-50">
        <WandSparkles className="size-4" aria-hidden="true" />
        {isAutoSelecting ? "Montando..." : "Escalação automática"}
      </button>
      <button type="button" onClick={onSave} disabled={!canSave || isSaving} className="min-h-8 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground">
        {isSaving ? "Salvando..." : budget < 0 ? "Orçamento excedido" : canSave ? "Salvar time" : `Faltam ${remainingSlots}`}
      </button>
    </div>
    {saveMessage && <p className="text-center text-xs font-medium text-muted-foreground" role="status">{saveMessage}</p>}
  </section>;
}
