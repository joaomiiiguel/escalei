"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { saveLineup } from "@/app/escalar/actions";
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
  const totalCost = useMemo(() => selectedPlayers.reduce((total, player) => total + player.price, 0), [selectedPlayers]);
  const handleSelectedPlayersChange = useCallback((players: LineupPlayer[]) => setSelectedPlayers(players), []);
  const handleFormationChange = useCallback((nextFormation: Formation) => {
    setFormation(nextFormation);
    setAutoPlayers(undefined);
  }, []);
  const save = useCallback(() => {
    setMessage(null);
    startSaving(async () => {
      const result = await saveLineup({ formation, playerIds: selectedPlayers.map((player) => player.id), roundId });
      setMessage(result.error ?? "Não foi possível salvar seu time.");
    });
  }, [formation, roundId, selectedPlayers]);
  const autoSelect = useCallback(async () => {
    setIsAutoSelecting(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/escalacao-automatica?formacao=${formation}`);
      const data = await response.json() as { players?: LineupPlayer[]; hasPerformanceData?: boolean; error?: string };
      if (!response.ok || !data.players) throw new Error(data.error ?? "Não foi possível montar a escalação automática.");
      if (data.players.length !== 11 || data.players.reduce((total, player) => total + player.price, 0) > budget) throw new Error("Não há jogadores suficientes dentro do seu saldo.");
      setAutoPlayers(data.players);
      setMessage(data.hasPerformanceData ? "Escalação baseada em desempenho e contexto da rodada. Revise antes de salvar." : "Escalação montada com os sinais disponíveis da rodada. Revise antes de salvar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível montar a escalação automática.");
    } finally {
      setIsAutoSelecting(false);
    }
  }, [budget, formation]);

  return <>
    <LineupFormation autoPlayers={autoPlayers} budget={budget} className="h-[65vh]" formation={formation} initialPlayers={initialPlayers} onFormationChange={handleFormationChange} onSelectedPlayersChange={handleSelectedPlayersChange} />
    <LineupSummary budget={budget - totalCost} isAutoSelecting={isAutoSelecting} isSaving={isSaving} onAutoSelect={autoSelect} onSave={save} saveMessage={message} selectedPlayers={selectedPlayers.length} />
  </>;
}
