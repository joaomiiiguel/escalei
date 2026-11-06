import { WandSparkles } from "lucide-react";
import type { PassStatus } from "@/lib/round-pass";
import { LoadingContent } from "./loading-content";
import { PassInfo } from "./pass-info";
import { quietPanel, scoreboard } from "./scoreboard";

type LineupSummaryProps = {
  budget?: number;
  hasSavedTeam?: boolean;
  passStatus?: PassStatus | null;
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

export function LineupSummary({ budget = 100, hasSavedTeam = false, passStatus, selectedPlayers = 0, isSaving = false, isAutoSelecting = false, onAutoSelect, onSave, saveMessage }: LineupSummaryProps) {
  const remainingSlots = Math.max(0, 11 - selectedPlayers);
  const averagePerSlot = remainingSlots ? budget / remainingSlots : 0;
  const canSave = selectedPlayers === 11 && budget >= 0;

  return <section className={`${quietPanel} mb-32 grid gap-4 p-4`} aria-label="Resumo da escalação">
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className={`${scoreboard} text-[40px] leading-[0.85] ${budget < 0 ? "text-warning" : "text-giz"}`}>{formatCurrency(budget)}</p>
        <p className="mt-1.5 text-sm text-giz/70">{budget < 0 ? "acima do seu saldo" : "sobram no seu saldo"}</p>
      </div>
      <div className="text-right">
        <p className={`${scoreboard} text-[40px] leading-[0.85]`}>{selectedPlayers}<span className="text-giz/40">/11</span></p>
        <p className="mt-1.5 text-sm text-giz/70">escalados</p>
      </div>
    </div>

    <div className="grid grid-cols-11 gap-1" role="progressbar" aria-label="Progresso da escalação" aria-valuemin={0} aria-valuemax={11} aria-valuenow={selectedPlayers}>
      {Array.from({ length: 11 }, (_, index) => <span className={`h-2 rounded-[3px] ${index < selectedPlayers ? "bg-primary" : "bg-giz/15"}`} key={index} />)}
    </div>
    {remainingSlots > 0 && budget >= 0 && <p className="-mt-1 text-sm text-giz/70">Média de <b className="text-giz">{formatCurrency(averagePerSlot)}</b> por vaga que falta.</p>}

    {passStatus && <PassInfo hasSavedTeam={hasSavedTeam} status={passStatus} />}

    <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2">
      <button type="button" onClick={onAutoSelect} disabled={isAutoSelecting || isSaving} aria-busy={isAutoSelecting || undefined} className="flex min-h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-[14px] border border-giz/25 px-2 text-[14px] font-bold text-giz outline-none transition hover:border-giz focus-visible:ring-2 focus-visible:ring-giz disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-wait aria-busy:opacity-75">
        <LoadingContent loading={isAutoSelecting} loadingText="Montando…">
          <WandSparkles className="size-4" aria-hidden="true" />
          Escalação automática
        </LoadingContent>
      </button>
      <button type="button" onClick={onSave} disabled={!canSave || isSaving} aria-busy={isSaving || undefined} className="flex min-h-12 items-center justify-center rounded-[14px] bg-primary px-3 text-[15px] font-extrabold text-primary-foreground outline-none transition hover:bg-[#d6ff4d] focus-visible:ring-2 focus-visible:ring-giz focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:not-aria-busy:bg-muted disabled:not-aria-busy:text-giz/60 aria-busy:cursor-wait aria-busy:opacity-75">
        <LoadingContent loading={isSaving} loadingText="Salvando…">
          {budget < 0 ? "Orçamento excedido" : canSave ? "Salvar time" : `Faltam ${remainingSlots}`}
        </LoadingContent>
      </button>
    </div>
    {saveMessage && <p className="text-center text-sm text-giz/75" role="status">{saveMessage}</p>}
  </section>;
}
