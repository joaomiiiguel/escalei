"use client";

import { ArrowDownUp, Search, TriangleAlert, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonGroup } from "./button-group";
import { Button } from "./button";
import { Input } from "./input";
import { TeamLogo } from "./team-logo";


type Formation = "4-3-3" | "4-4-2" | "3-5-2";
type Position = "ATA" | "MEI" | "LAT" | "ZAG" | "GOL";
type CatalogPosition = "ATA" | "MEI" | "DEF" | "GOL";

export type LineupPlayer = { club: string; clubName: string; id: number; logoUrl: string | null; name: string; position: CatalogPosition; price: number };

type LineupFormationProps = {
  className?: string;
  formation?: Formation;
  initialPlayers?: LineupPlayer[];
  autoPlayers?: LineupPlayer[];
  readOnly?: boolean;
  onFormationChange?: (formation: Formation) => void;
  onSelectedPlayersChange?: (players: LineupPlayer[]) => void;
};

const formations: Formation[] = ["4-3-3", "4-4-2", "3-5-2"];
const formationLines: Record<Formation, Position[][]> = {
  "4-3-3": [["ATA", "ATA", "ATA"], ["MEI", "MEI", "MEI"], ["LAT", "ZAG", "ZAG", "LAT"], ["GOL"]],
  "4-4-2": [["ATA", "ATA"], ["MEI", "MEI", "MEI", "MEI"], ["LAT", "ZAG", "ZAG", "LAT"], ["GOL"]],
  "3-5-2": [["ATA", "ATA"], ["MEI", "MEI", "MEI", "MEI", "MEI"], ["ZAG", "ZAG", "ZAG"], ["GOL"]],
};

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
  return <button type="button" onClick={onClick} className="relative z-10 grid justify-items-center gap-1.5 rounded-lg outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring">
    <span className="grid size-10 place-items-center rounded-full border border-primary/80 bg-background/10 text-xl font-light text-primary transition-colors duration-200 hover:bg-primary/20 active:bg-primary/50" aria-hidden="true">+</span>
    <span className="text-[10px] font-bold text-foreground">{position}</span>
  </button>;
}

function FilledSlot({ onClick, player, position, readOnly = false }: { onClick: () => void; player: LineupPlayer; position: Position; readOnly?: boolean }) {
  return <button type="button" disabled={readOnly} onClick={onClick} className="relative z-10 grid justify-items-center gap-1 rounded-lg outline-none transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:hover:scale-100" aria-label={readOnly ? `${player.name}, ${position}` : `Trocar ${player.name}, ${position}`}>
    <span className="grid size-10 place-items-center rounded-full border border-primary/70 bg-background/85 p-1 shadow-lg shadow-black/25"><TeamLogo className="size-8 rounded-full" logoUrl={player.logoUrl} nome={player.clubName} sigla={player.club} /></span>
    <span className="w-full truncate text-center text-[10px] font-extrabold text-foreground">{player.name}</span>
    <span className="text-[9px] font-bold text-primary">C$ {player.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
  </button>;
}

function PlayerListSkeleton() {
  return <ul className="space-y-2 py-3" aria-label="Carregando jogadores" aria-busy="true">
    {Array.from({ length: 5 }, (_, index) => <li className="flex items-center gap-3 rounded-xl bg-card-foreground/55 p-3" key={index}><span className="size-10 shrink-0 animate-pulse rounded-full bg-muted" /><div className="min-w-0 flex-1 space-y-2"><span className="block h-3.5 w-3/5 animate-pulse rounded bg-muted" /><span className="block h-3 w-2/5 animate-pulse rounded bg-muted/80" /></div><span className="h-4 w-12 animate-pulse rounded bg-muted" /></li>)}
  </ul>;
}

function PlayerPickerSheet({ maxAvailablePrice, onClose, onSelect, position, selectedPlayerIds }: { maxAvailablePrice: number; onClose: () => void; onSelect: (player: LineupPlayer) => void; position: Position; selectedPlayerIds: Set<number> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [players, setPlayers] = useState<LineupPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState("todos");
  const [maxPrice, setMaxPrice] = useState(20);
  const [priceOrder, setPriceOrder] = useState<"asc" | "desc">("asc");
  const closeTimeout = useRef<number | null>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const clubs = [...new Set(players.map((player) => player.club))].sort((first, second) => first.localeCompare(second));
  const visiblePlayers = players
    .filter((player) => `${player.name} ${player.club}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch))
    .filter((player) => clubFilter === "todos" || player.club === clubFilter)
    .filter((player) => player.price <= maxPrice)
    .sort((first, second) => priceOrder === "asc" ? first.price - second.price : second.price - first.price);
  const hasActiveFilters = clubFilter !== "todos" || maxPrice !== 20 || priceOrder !== "asc";

  function clearFilters() {
    setClubFilter("todos");
    setMaxPrice(20);
    setPriceOrder("asc");
  }

  useEffect(() => {
    setIsMounted(true);
    const frame = window.requestAnimationFrame(() => setIsOpen(true));
    const controller = new AbortController();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    async function loadPlayers() {
      try {
        const response = await fetch(`/api/jogadores?posicao=${catalogPositionBySlot[position]}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Falha ao carregar jogadores");
        const data = await response.json() as { players: LineupPlayer[] };
        setPlayers(data.players);
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") setHasError(true);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    void loadPlayers();
    return () => {
      controller.abort();
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      if (closeTimeout.current) window.clearTimeout(closeTimeout.current);
    };
  }, [onClose]);

  function close() {
    setIsOpen(false);
    closeTimeout.current = window.setTimeout(onClose, 220);
  }

  const sheet = (
    <div className="fixed inset-0 z-[70] flex items-end mx-auto max-w-lg">
      <button type="button" className={`absolute inset-0 bg-black/65 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={close} aria-label="Fechar lista de jogadores" />
      <section className={`relative z-10 grid h-[82dvh] w-full grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden rounded-t-3xl border-t border-border bg-card shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none ${isOpen ? "translate-y-0" : "translate-y-full"}`} role="dialog" aria-modal="true" aria-labelledby="player-picker-title">
        <div className="mx-auto mt-3 h-1 w-9 rounded-full bg-muted-foreground/60" aria-hidden="true" />
        <header className="flex items-center justify-between px-5 pb-3 pt-4"><div><h2 id="player-picker-title" className="text-lg font-extrabold text-foreground">Mercado</h2><p className="text-xs font-medium text-muted-foreground">{isLoading ? "Carregando jogadores" : `${players.length} jogadores`}</p></div><button type="button" onClick={close} className="grid size-9 place-items-center rounded-full bg-muted text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Fechar"><X className="size-4" /></button></header>
        <div className="border-t border-border px-5 pt-3">
          <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 border-0 bg-muted pl-9 pr-9 text-sm" placeholder="Buscar jogador ou clube" aria-label="Buscar jogador ou clube" />{search && <button type="button" onClick={() => setSearch("")} className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-background" aria-label="Limpar busca"><X className="size-3.5" /></button>}</label>
          <div className="flex gap-1.5 overflow-x-auto py-3" aria-label="Filtros do mercado">
            <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">{position}</span>
            <label className="relative shrink-0 text-sm"><span className="sr-only">Filtrar por clube</span><select value={clubFilter} onChange={(event) => setClubFilter(event.target.value)} className="h-6 appearance-none rounded-full bg-muted py-0 pl-3 pr-7 text-[10px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="todos">Clube</option>{clubs.map((club) => <option key={club} value={club}>{club}</option>)}</select><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">⌄</span></label>
            <button type="button" onClick={() => setPriceOrder((order) => order === "asc" ? "desc" : "asc")} className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-primary/60 bg-primary/10 px-2.5 text-[10px] font-bold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Ordenar preço ${priceOrder === "asc" ? "decrescente" : "crescente"}`}><ArrowDownUp className="size-3" />Preço {priceOrder === "asc" ? "↑" : "↓"}</button>
            <label className="relative shrink-0 text-sm"><span className="sr-only">Preço máximo</span><select value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="h-6 appearance-none rounded-full bg-muted py-0 pl-3 pr-7 text-[10px] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value={5}>Até C$ 5</option><option value={10}>Até C$ 10</option><option value={15}>Até C$ 15</option><option value={20}>C$ 0–20</option></select><span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">⌄</span></label>
            {hasActiveFilters && <button type="button" onClick={clearFilters} className="h-6 shrink-0 rounded-full px-2 text-[10px] font-bold text-muted-foreground underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-ring">Limpar</button>}
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-border px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {isLoading ? <PlayerListSkeleton /> : hasError ? <p className="py-10 text-center text-sm text-muted-foreground">Não foi possível carregar os jogadores. Feche e tente novamente.</p> : visiblePlayers.length === 0 ? <div className="py-12 text-center"><Search className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden="true" /><p className="text-sm font-bold text-foreground">Nenhum jogador encontrado</p><p className="mt-1 text-xs text-muted-foreground">Tente outro nome ou clube.</p></div> : <ul className="divide-y divide-border">{visiblePlayers.map((player) => { const isSelected = selectedPlayerIds.has(player.id); const isOverBudget = player.price > maxAvailablePrice; const isUnavailable = isSelected || isOverBudget; return <li key={player.id}><button type="button" disabled={isUnavailable} onClick={() => onSelect(player)} className="flex w-full items-center justify-between gap-3 py-3 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-40"><TeamLogo className="size-9 shrink-0 rounded-full" logoUrl={player.logoUrl} nome={player.clubName} sigla={player.club} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-foreground">{player.name}</p><p className="mt-0.5 text-xs font-medium text-muted-foreground">{isSelected ? "Já escalado" : isOverBudget ? "Fora do orçamento" : `${player.club} · ${player.position}`}</p></div><strong className="shrink-0 text-sm text-primary">C$ {player.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></button></li>; })}</ul>}
        </div>
      </section>
    </div>
  );

  return isMounted ? createPortal(sheet, document.body) : null;
}

export function LineupFormation({ autoPlayers, className = "", formation = "4-3-3", initialPlayers = [], onFormationChange, onSelectedPlayersChange, readOnly = false }: LineupFormationProps) {
  const [selectedFormation, setSelectedFormation] = useState<Formation>(formation);
  const [transitionPhase, setTransitionPhase] = useState<"idle" | "leaving" | "entering">("idle");
  const [selectedSlot, setSelectedSlot] = useState<{ key: string; position: Position } | null>(null);
  const [playersBySlot, setPlayersBySlot] = useState<Record<string, LineupPlayer>>(() => playersInSlots(initialPlayers, formation));
  const transitionTimeout = useRef<number | null>(null);
  const lines = formationLines[selectedFormation];
  const closePlayerPicker = useCallback(() => setSelectedSlot(null), []);
  const selectedPlayers = Object.values(playersBySlot);
  const totalCost = selectedPlayers.reduce((total, player) => total + player.price, 0);
  const currentSlotPrice = selectedSlot ? playersBySlot[selectedSlot.key]?.price ?? 0 : 0;
  const maxAvailablePrice = 100 - totalCost + currentSlotPrice;
  const selectPlayer = useCallback((player: LineupPlayer) => {
    if (!selectedSlot || player.price > maxAvailablePrice) return;
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
      <p id="lineup-formation-title" className="shrink-0 text-[12px] font-semibold text-muted-foreground">Formação</p>
      <ButtonGroup className="h-8 w-[218px] max-w-[calc(100%-5rem)] gap-0 rounded-[10px] bg-card-foreground p-0.5 [&>[data-slot=button]]:!h-7 [&>[data-slot=button]]:!min-h-0 [&>[data-slot=button]]:flex-1 [&>[data-slot=button]]:!rounded-lg" aria-label="Selecionar formação">
        {formations.map((item) => <Button className="px-0 !text-[11px] !font-bold shadow-none !border-0" onClick={() => changeFormation(item)} disabled={transitionPhase !== "idle"} key={item} variant={item === selectedFormation ? "default" : "ghost"} size="sm" aria-pressed={item === selectedFormation}>{item}</Button>)}
      </ButtonGroup>
    </div>}

    <div className="relative flex-1 overflow-hidden rounded-[14px] border border-primary/50 bg-linear-to-b from-emerald-950 via-emerald-900/70 to-emerald-950 p-3 shadow-inner shadow-black/30">
      <div className="pointer-events-none absolute inset-1.5 rounded-[10px] border border-primary/35" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-1.5 top-1/2 border-t border-primary/35" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/35" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-1.5 h-10 w-[42%] -translate-x-1/2 border-x border-b border-primary/35" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 h-10 w-[42%] -translate-x-1/2 border-x border-t border-primary/35" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 h-5 w-[22%] -translate-x-1/2 border-x border-t border-primary/35" aria-hidden="true" />

      <div className={`absolute inset-0 z-10 grid grid-rows-4 px-3 py-2 transition-[opacity,transform] duration-300 motion-reduce:transition-none ${transitionPhase === "leaving" ? "-translate-y-1 scale-[0.97] opacity-0 ease-in" : transitionPhase === "entering" ? "translate-y-1 scale-[0.97] opacity-0 ease-out" : "translate-y-0 scale-100 opacity-100 ease-out"}`}>
        {lines.map((line, index) => <div className={`grid items-center ${line.length === 5 ? "grid-cols-5" : line.length === 4 ? "grid-cols-4" : line.length === 3 ? "grid-cols-3" : line.length === 2 ? "grid-cols-2" : "grid-cols-1"}`} key={index}>
          {line.map((position, slot) => {
            const slotKey = `${position}-${slot}`;
            const player = playersBySlot[slotKey];
            return player ? <FilledSlot key={slotKey} onClick={() => setSelectedSlot({ key: slotKey, position })} player={player} position={position} readOnly={readOnly} /> : <EmptySlot key={slotKey} onClick={() => setSelectedSlot({ key: slotKey, position })} position={position} />;
          })}
        </div>)}
      </div>
    </div>

    {!readOnly && <p className="flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2 text-[11px] leading-4 text-primary/50">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      Toque em um “+” para escolher o jogador daquela posição.
    </p>}
    <p className="sr-only">{selectedPlayers.length} de 11 jogadores escalados.</p>
    {!readOnly && selectedSlot && <PlayerPickerSheet maxAvailablePrice={maxAvailablePrice} onClose={closePlayerPicker} onSelect={selectPlayer} position={selectedSlot.position} selectedPlayerIds={new Set(selectedPlayers.map((player) => player.id))} />}
  </section>;
}
