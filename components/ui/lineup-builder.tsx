"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { saveLineup } from "@/app/escalar/actions";
import { fitsBudget, remainingBudget, sumPrices } from "@/lib/lineup-rules";
import { LineupFormation, type LineupPlayer } from "./lineup-formation";
import { LineupSummary } from "./lineup-summary";

type Formation = "4-3-3" | "4-4-2" | "3-5-2";
type LineupBuilderProps = { budget: number; initialFormation?: Formation; initialPlayers?: LineupPlayer[]; roundId: number };

export function LineupBuilder({ budget, initialFormation = "4-3-3", initialPlayers = [], roundId }: LineupBuilderProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<LineupPlayer[]>(initialPlayers);
  const [formation, setFormation] = useState<Formation>(initialFormation);
  const [autoPlayers, setAutoPlayers] = useState<LineupPlayer[] | undefined>();
  const [isAutoSelecting, setIsAutoSelecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const openedAt = useRef(Date.now());
  const totalCost = useMemo(() => sumPrices(selectedPlayers.map((player) => player.price)), [selectedPlayers]);
  const handleSelectedPlayersChange = useCallback((players: LineupPlayer[]) => setSelectedPlayers(players), []);
  const handleFormationChange = useCallback((nextFormation: Formation) => {
    setFormation(nextFormation);
    setAutoPlayers(undefined);
  }, []);
  const save = useCallback(() => {
    setMessage(null);
    startSaving(async () => {
      const result = await saveLineup({
        formation,
        playerIds: selectedPlayers.map((player) => player.id),
        roundId,
        durationSeconds: (Date.now() - openedAt.current) / 1000,
        isEdit: initialPlayers.length > 0,
      });
      setMessage(result.error ?? "Não foi possível salvar seu time.");
    });
  }, [formation, initialPlayers.length, roundId, selectedPlayers]);
  const autoSelect = useCallback(async () => {
    setIsAutoSelecting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/escalacao-automatica?formacao=${formation}`);
      const data = await response.json() as { players?: LineupPlayer[]; hasPerformanceData?: boolean; error?: string; algorithmVersion?: string };
      if (!response.ok || !data.players) throw new Error(data.error ?? "Não foi possível montar a escalação automática.");
      if (data.players.length !== 11) throw new Error("Não foi possível montar os 11 jogadores. Tente outra formação.");
      if (!fitsBudget(sumPrices(data.players.map((player) => player.price)), budget)) throw new Error("Não há jogadores suficientes dentro do seu saldo.");
      setAutoPlayers(data.players);
      const versionInfo = data.algorithmVersion ? ` (v${data.algorithmVersion})` : "";
      setMessage(data.hasPerformanceData ? `Escalação baseada em desempenho e contexto da rodada${versionInfo}. Revise antes de salvar.` : `Escalação montada com os sinais disponíveis da rodada${versionInfo}. Revise antes de salvar.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível montar a escalação automática.");
    } finally {
      setIsAutoSelecting(false);
    }
  }, [budget, formation]);

  return <>
    <LineupFormation autoPlayers={autoPlayers} budget={budget} className="h-[65vh]" formation={formation} initialPlayers={initialPlayers} onFormationChange={handleFormationChange} onSelectedPlayersChange={handleSelectedPlayersChange} />
    <LineupSummary budget={remainingBudget(budget, [totalCost])} isAutoSelecting={isAutoSelecting} isSaving={isSaving} onAutoSelect={autoSelect} onSave={save} saveMessage={message} selectedPlayers={selectedPlayers.length} />
  </>;
}
