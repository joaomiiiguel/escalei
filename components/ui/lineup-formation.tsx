"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PitchLines } from "./pitch-lines";
import { PlayerPickerSheet } from "./player-picker-sheet";
import { scoreboard } from "./scoreboard";
import { TeamLogo } from "./team-logo";
import { fitsBudget, remainingBudget, sumPrices } from "@/lib/lineup-rules";
import { availabilityText, isUnavailable, type PlayerAvailability } from "@/lib/player-availability";
import type { PlayerRole } from "@/lib/player-role";
import { formatPoints } from "@/lib/round-home";


type Formation = "4-3-3" | "4-4-2" | "3-5-2";
type Position = "ATA" | "MEI" | "LAT" | "ZAG" | "GOL";
type CatalogPosition = "ATA" | "MEI" | "DEF" | "GOL";

export type LineupPlayer = {
  club: string;
  clubName: string;
  id: number;
  logoUrl: string | null;
  name: string;
  position: CatalogPosition;
  price: number;
  roundLabel?: string;
  roundPoints?: number;
  roundStatus?: "A_JOGAR" | "ADIADO" | "EM_ANDAMENTO" | "ENCERRADO" | "SEM_JOGO";
  /** Status para a rodada aberta; lesionado e suspenso não podem ser escalados (JOA-164). */
  status?: PlayerAvailability;
  statusReason?: string | null;
  /** Titular ou reserva no último jogo do clube; `null` sem dados (JOA-170). */
  lastGameRole?: PlayerRole | null;
};

type LineupFormationProps = {
  className?: string;
  formation?: Formation;
  initialPlayers?: LineupPlayer[];
  autoPlayers?: LineupPlayer[];
  budget?: number;
  readOnly?: boolean;
  showRoundStatus?: boolean;
  onFormationChange?: (formation: Formation) => void;
  onSelectedPlayersChange?: (players: LineupPlayer[]) => void;
};

const formations: Formation[] = ["4-3-3", "4-4-2", "3-5-2"];
const formationLines: Record<Formation, Position[][]> = {
  "4-3-3": [["ATA", "ATA", "ATA"], ["MEI", "MEI", "MEI"], ["LAT", "ZAG", "ZAG", "LAT"], ["GOL"]],
  "4-4-2": [["ATA", "ATA"], ["MEI", "MEI", "MEI", "MEI"], ["LAT", "ZAG", "ZAG", "LAT"], ["GOL"]],
  "3-5-2": [["ATA", "ATA"], ["MEI", "MEI", "MEI", "MEI", "MEI"], ["ZAG", "ZAG", "ZAG"], ["GOL"]],
};

const lineColumns: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5" };
const catalogPositionBySlot: Record<Position, CatalogPosition> = { ATA: "ATA", MEI: "MEI", LAT: "DEF", ZAG: "DEF", GOL: "GOL" };
const positionTitle: Record<Position, string> = { ATA: "Atacante", MEI: "Meia", LAT: "Lateral", ZAG: "Zagueiro", GOL: "Goleiro" };

function playersInSlots(players: LineupPlayer[], formation: Formation) {
  const remainingPlayers = [...players];
  const slots: Record<string, LineupPlayer> = {};
  for (const line of formationLines[formation]) {
    line.forEach((position, slot) => {
      const playerIndex = remainingPlayers.findIndex((player) => player.position === catalogPositionBySlot[position]);
      if (playerIndex >= 0) slots[`${position}-${slot}`] = remainingPlayers.splice(playerIndex, 1)[0];
    });
  }
  return slots;
}

function slotKeysForFormation(formation: Formation) {
  return new Set(formationLines[formation].flatMap((line) => line.map((position, slot) => `${position}-${slot}`)));
}

function EmptySlot({ onClick, position }: { onClick: () => void; position: Position }) {
  return <button type="button" onClick={onClick} className="group relative z-10 grid justify-items-center gap-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-giz" aria-label={`Escolher ${positionTitle[position].toLowerCase()}, ${position}`}>
    <span className="grid size-11 place-items-center rounded-full border-2 border-dashed border-giz/55 bg-gramado-escuro/40 text-2xl leading-none text-giz transition-colors group-hover:border-primary group-hover:text-primary group-active:bg-primary/25" aria-hidden="true">+</span>
    <span className={`${scoreboard} text-[15px] leading-none text-giz/80`}>{position}</span>
  </button>;
}

/** O que aparece abaixo do nome depois da trava: pontos, jogo em andamento ou horário. */
function RoundMeta({ player }: { player: LineupPlayer }) {
  if (player.roundStatus === "ENCERRADO") {
    const negative = (player.roundPoints ?? 0) < 0;
    return <span className={`${scoreboard} rounded-md px-1.5 pt-0.5 text-[15px] leading-tight ${negative ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>{formatPoints(player.roundPoints ?? 0)}</span>;
  }
  if (player.roundStatus === "EM_ANDAMENTO") return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warning"><span className="size-1.5 rounded-full bg-warning motion-safe:animate-pulse" aria-hidden="true" />em campo</span>;
  if (player.roundStatus === "ADIADO") return <span className="text-[11px] font-bold text-warning">adiado</span>;
  if (player.roundStatus === "A_JOGAR") return <span className="text-[11px] font-bold text-giz/70">{player.roundLabel ?? "a jogar"}</span>;
  return <span className="text-[11px] font-bold text-giz/55">sem jogo</span>;
}

function FilledSlot({ onClick, player, position, readOnly = false, showRoundStatus = false }: { onClick: () => void; player: LineupPlayer; position: Position; readOnly?: boolean; showRoundStatus?: boolean }) {
  // Depois da trava vale o andamento do jogo; antes, o status da rodada aberta.
  const statusText = showRoundStatus ? null : availabilityText(player.status, player.statusReason);
  const unavailable = !showRoundStatus && isUnavailable(player.status);
  const label = `${readOnly ? "" : "Trocar "}${player.name}, ${position}${statusText ? `, ${statusText}` : ""}`;
  return <button type="button" disabled={readOnly} onClick={onClick} className="group relative z-10 grid min-w-0 justify-items-center gap-1 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-giz disabled:cursor-default" aria-label={label}>
    <span className={`relative grid size-11 place-items-center rounded-full bg-background/90 shadow-[0_6px_14px_rgb(0_0_0/0.45)] ring-2 transition-transform group-enabled:group-hover:scale-105 ${unavailable ? "ring-destructive-foreground/80" : "ring-primary"}`}>
      <TeamLogo className="size-8" logoUrl={player.logoUrl} nome={player.clubName} sigla={player.club} />
      {statusText && <span className={`absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full text-[11px] font-black ${unavailable ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}`} aria-hidden="true">{unavailable ? "!" : "?"}</span>}
    </span>
    <span className="max-w-full truncate rounded-md bg-background/85 px-1.5 py-0.5 text-[11px] font-bold leading-tight text-giz">{player.name}</span>
    {showRoundStatus ? <RoundMeta player={player} />
      : unavailable ? <span className="text-[11px] font-bold text-destructive-foreground">{player.status === "SUSPENSO" ? "suspenso" : "lesionado"}</span>
        : <span className={`${scoreboard} text-[14px] leading-none text-primary`}>C$ {player.price.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
  </button>;
}

export function LineupFormation({ autoPlayers, budget = 100, className = "", formation = "4-3-3", initialPlayers = [], onFormationChange, onSelectedPlayersChange, readOnly = false, showRoundStatus = false }: LineupFormationProps) {
  const [selectedFormation, setSelectedFormation] = useState<Formation>(formation);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "leaving" | "entering">("idle");
  const [selectedSlot, setSelectedSlot] = useState<{ key: string; position: Position } | null>(null);
  const [playersBySlot, setPlayersBySlot] = useState<Record<string, LineupPlayer>>(() => playersInSlots(initialPlayers, formation));
  const transitionTimeout = useRef<number | null>(null);
  const lines = formationLines[selectedFormation];
  const closePlayerPicker = useCallback(() => setSelectedSlot(null), []);
  const selectedPlayers = Object.values(playersBySlot);
  const totalCost = sumPrices(selectedPlayers.map((player) => player.price));
  const currentSlotPrice = selectedSlot ? playersBySlot[selectedSlot.key]?.price ?? 0 : 0;
  // Em centavos: somas de preços com casas decimais não podem recusar quem cabe no saldo.
  const maxAvailablePrice = remainingBudget(budget, [totalCost, -currentSlotPrice]);
  const selectPlayer = useCallback((player: LineupPlayer) => {
    if (!selectedSlot || !fitsBudget(player.price, maxAvailablePrice)) return;
    setPlayersBySlot((current) => ({ ...current, [selectedSlot.key]: player }));
    setSelectedSlot(null);
  }, [maxAvailablePrice, selectedSlot]);

  useEffect(() => () => {
    if (transitionTimeout.current) window.clearTimeout(transitionTimeout.current);
  }, []);

  useEffect(() => {
    onSelectedPlayersChange?.(Object.values(playersBySlot));
  }, [onSelectedPlayersChange, playersBySlot]);

  useEffect(() => {
    if (autoPlayers?.length) setPlayersBySlot(playersInSlots(autoPlayers, selectedFormation));
  }, [autoPlayers, selectedFormation]);

  function changeFormation(nextFormation: Formation) {
    if (nextFormation === selectedFormation || transitionPhase !== "idle") return;
    setTransitionPhase("leaving");
    transitionTimeout.current = window.setTimeout(() => {
      setSelectedFormation(nextFormation);
      const availableSlots = slotKeysForFormation(nextFormation);
      setPlayersBySlot((current) => Object.fromEntries(Object.entries(current).filter(([slotKey]) => availableSlots.has(slotKey))));
      onFormationChange?.(nextFormation);
      setTransitionPhase("entering");
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => setTransitionPhase("idle")));
    }, 240);
  }

  return <section className={`flex flex-col gap-3 ${className}`} aria-labelledby="lineup-formation-title">
    {!readOnly && <div className="flex items-center justify-between gap-3">
      <p id="lineup-formation-title" className="text-[15px] font-bold text-giz/75">Formação</p>
      <div role="group" aria-label="Selecionar formação" className="grid grid-cols-3 gap-1 rounded-full border border-giz/15 bg-background/70 p-1">
        {formations.map((item) => <button type="button" key={item} onClick={() => changeFormation(item)} disabled={transitionPhase !== "idle"} aria-pressed={item === selectedFormation} className={`${scoreboard} h-9 min-w-[4.25rem] rounded-full px-3 text-[19px] leading-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-giz aria-pressed:bg-primary aria-pressed:text-primary-foreground not-aria-pressed:text-giz/75 not-aria-pressed:hover:text-giz`}>{item}</button>)}
      </div>
    </div>}

    <div className="relative flex-1 overflow-hidden rounded-[20px] border border-gramado bg-gramado-escuro bg-[repeating-linear-gradient(180deg,rgb(13_74_50/0.6)_0_10%,transparent_10%_20%)] shadow-[inset_0_0_40px_rgb(0_0_0/0.45)]">
      <PitchLines />
      <div className={`absolute inset-0 z-10 grid grid-rows-4 gap-2 px-2 py-3 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${transitionPhase === "leaving" ? "-translate-y-1 scale-[0.97] opacity-0 ease-in" : transitionPhase === "entering" ? "translate-y-1 scale-[0.97] opacity-0 ease-out" : "translate-y-0 scale-100 opacity-100 ease-out"}`}>
        {lines.map((line, index) => <div className={`grid items-center gap-1 ${lineColumns[line.length]}`} key={index}>
          {line.map((position, slot) => {
            const slotKey = `${position}-${slot}`;
            const player = playersBySlot[slotKey];
            return player ? <FilledSlot key={slotKey} onClick={() => setSelectedSlot({ key: slotKey, position })} player={player} position={position} readOnly={readOnly} showRoundStatus={showRoundStatus} /> : <EmptySlot key={slotKey} onClick={() => setSelectedSlot({ key: slotKey, position })} position={position} />;
          })}
        </div>)}
      </div>
    </div>

    {!readOnly && selectedPlayers.length < 11 && <p className="text-center text-sm text-giz/70">Toque numa vaga para escolher o jogador daquela posição.</p>}
    <p className="sr-only">{selectedPlayers.length} de 11 jogadores escalados.</p>
    {!readOnly && selectedSlot && <PlayerPickerSheet catalogPosition={catalogPositionBySlot[selectedSlot.position]} slotLabel={selectedSlot.position} maxAvailablePrice={maxAvailablePrice} onClose={closePlayerPicker} onSelect={selectPlayer} selectedPlayerIds={new Set(selectedPlayers.map((player) => player.id))} />}
  </section>;
}
