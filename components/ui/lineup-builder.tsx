"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { saveLineup } from "@/app/escalar/actions";
import { LineupFormation, type LineupPlayer } from "./lineup-formation";
import { LineupSummary } from "./lineup-summary";

const ROUND_BUDGET = 100;

type Formation = "4-3-3" | "4-4-2" | "3-5-2";
type LineupBuilderProps = { initialFormation?: Formation; initialPlayers?: LineupPlayer[]; roundId: number };

export function LineupBuilder({ initialFormation = "4-3-3", initialPlayers = [], roundId }: LineupBuilderProps) {
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
    const required: Record<Formation, Record<LineupPlayer["position"], number>> = {
      "4-3-3": { GOL: 1, DEF: 4, MEI: 3, ATA: 3 },
      "4-4-2": { GOL: 1, DEF: 4, MEI: 4, ATA: 2 },
      "3-5-2": { GOL: 1, DEF: 3, MEI: 5, ATA: 2 },
    };
    setIsAutoSelecting(true);
    setMessage(null);
    try {
      const positions = Object.keys(required[formation]) as LineupPlayer["position"][];
      const responses = await Promise.all(positions.map(async (position) => {
        const response = await fetch(`/api/jogadores?posicao=${position}`);
        if (!response.ok) throw new Error("Não foi possível carregar o mercado.");
        return (await response.json() as { players: LineupPlayer[] }).players;
      }));
      const lineup = positions.flatMap((position, index) => [...responses[index]].sort((first, second) => first.price - second.price).slice(0, required[formation][position]));
      if (lineup.length !== 11 || lineup.reduce((total, player) => total + player.price, 0) > ROUND_BUDGET) throw new Error("Não há jogadores suficientes dentro do orçamento.");
      setAutoPlayers(lineup);
      setMessage("Escalação automática aplicada. Revise antes de salvar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível montar a escalação automática.");
    } finally {
      setIsAutoSelecting(false);
    }
  }, [formation]);

  return <>
    <LineupFormation autoPlayers={autoPlayers} className="h-[65vh]" formation={formation} initialPlayers={initialPlayers} onFormationChange={handleFormationChange} onSelectedPlayersChange={handleSelectedPlayersChange} />
    <LineupSummary budget={ROUND_BUDGET - totalCost} isAutoSelecting={isAutoSelecting} isSaving={isSaving} onAutoSelect={autoSelect} onSave={save} saveMessage={message} selectedPlayers={selectedPlayers.length} />
  </>;
}
