"use client";

import { ArrowDownUp, ChevronDown, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Input } from "./input";
import { PlayerRoleTag } from "./player-role-tag";
import { scoreboard } from "./scoreboard";
import { TeamLogo } from "./team-logo";
import type { LineupPlayer } from "./lineup-formation";
import { fitsBudget } from "@/lib/lineup-rules";
import { availabilityText, isUnavailable } from "@/lib/player-availability";
import { marketRank } from "@/lib/player-role";

type PlayerPickerSheetProps = {
  /** Posição do catálogo consultada na API (GOL, DEF, MEI, ATA). */
  catalogPosition: LineupPlayer["position"];
  /** Rótulo da vaga no campo (ex.: LAT, ZAG). */
  slotLabel: string;
  maxAvailablePrice: number;
  selectedPlayerIds: Set<number>;
  onClose: () => void;
  onSelect: (player: LineupPlayer) => void;
};

const MAX_PRICE = 20;
const chip = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-giz";

function price(value: number) {
  return `C$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function PlayerListSkeleton() {
  return <ul className="space-y-1 py-3" aria-label="Carregando jogadores" aria-busy="true">
    {Array.from({ length: 5 }, (_, index) => <li className="flex items-center gap-3 py-3" key={index}>
      <span className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
      <div className="min-w-0 flex-1 space-y-2"><span className="block h-3.5 w-3/5 animate-pulse rounded bg-muted" /><span className="block h-3 w-2/5 animate-pulse rounded bg-muted/80" /></div>
      <span className="h-5 w-14 animate-pulse rounded bg-muted" />
    </li>)}
  </ul>;
}

/** Mercado da vaga escolhida: busca, filtros e lista de jogadores que cabem no saldo. */
export function PlayerPickerSheet({ catalogPosition, slotLabel, maxAvailablePrice, selectedPlayerIds, onClose, onSelect }: PlayerPickerSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [players, setPlayers] = useState<LineupPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState("todos");
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [priceOrder, setPriceOrder] = useState<"asc" | "desc">("asc");
  const closeTimeout = useRef<number | null>(null);
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const clubs = [...new Set(players.map((player) => player.club))].sort((first, second) => first.localeCompare(second));
  const visiblePlayers = players
    .filter((player) => `${player.name} ${player.club}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch))
    .filter((player) => clubFilter === "todos" || player.club === clubFilter)
    .filter((player) => player.price <= maxPrice)
    .sort((first, second) => marketRank(first.lastGameRole, isUnavailable(first.status)) - marketRank(second.lastGameRole, isUnavailable(second.status)) || (priceOrder === "asc" ? first.price - second.price : second.price - first.price));
  const hasActiveFilters = clubFilter !== "todos" || maxPrice !== MAX_PRICE || priceOrder !== "asc";

  function clearFilters() {
    setClubFilter("todos");
    setMaxPrice(MAX_PRICE);
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
        const response = await fetch(`/api/jogadores?posicao=${catalogPosition}`, { signal: controller.signal });
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
  }, [catalogPosition, onClose]);

  function close() {
    setIsOpen(false);
    closeTimeout.current = window.setTimeout(onClose, 220);
  }

  const sheet = (
    <div className="fixed inset-0 z-[70] mx-auto flex max-w-lg items-end font-(family-name:--font-body) text-giz">
      <button type="button" className={`absolute inset-0 bg-black/70 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`} onClick={close} aria-label="Fechar lista de jogadores" />
      <section className={`relative z-10 grid h-[85dvh] w-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-t-[24px] border-t border-gramado bg-background shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none ${isOpen ? "translate-y-0" : "translate-y-full"}`} role="dialog" aria-modal="true" aria-labelledby="player-picker-title">
        <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h2 id="player-picker-title" className={`${scoreboard} text-[32px] uppercase leading-[0.85]`}>Mercado</h2>
            <p className="mt-1.5 text-sm text-giz/70">{isLoading ? "Carregando jogadores" : `${visiblePlayers.length} de ${players.length} jogadores para ${slotLabel}`}</p>
          </div>
          <button type="button" onClick={close} className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-giz outline-none focus-visible:ring-2 focus-visible:ring-giz" aria-label="Fechar"><X className="size-5" /></button>
        </header>

        <div className="border-b border-border px-5 pb-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-giz/60" aria-hidden="true" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} className="h-11 rounded-xl border-0 bg-muted pl-10 pr-10 text-[15px]" placeholder="Buscar jogador ou clube" aria-label="Buscar jogador ou clube" />
            {search && <button type="button" onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-giz/70 hover:bg-background" aria-label="Limpar busca"><X className="size-4" /></button>}
          </label>
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]" aria-label="Filtros do mercado">
            <label className="relative shrink-0">
              <span className="sr-only">Filtrar por clube</span>
              <select value={clubFilter} onChange={(event) => setClubFilter(event.target.value)} className={`${chip} appearance-none bg-muted pr-8 text-giz`}>
                <option value="todos">Todos os clubes</option>
                {clubs.map((club) => <option key={club} value={club}>{club}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-giz/60" aria-hidden="true" />
            </label>
            <button type="button" onClick={() => setPriceOrder((order) => order === "asc" ? "desc" : "asc")} className={`${chip} border border-giz/25 text-giz`} aria-label={`Ordenar preço ${priceOrder === "asc" ? "decrescente" : "crescente"}`}>
              <ArrowDownUp className="size-4" aria-hidden="true" />{priceOrder === "asc" ? "Mais baratos" : "Mais caros"}
            </button>
            <label className="relative shrink-0">
              <span className="sr-only">Preço máximo</span>
              <select value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className={`${chip} appearance-none bg-muted pr-8 text-giz`}>
                <option value={5}>Até C$ 5</option>
                <option value={10}>Até C$ 10</option>
                <option value={15}>Até C$ 15</option>
                <option value={MAX_PRICE}>Qualquer preço</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-giz/60" aria-hidden="true" />
            </label>
            {hasActiveFilters && <button type="button" onClick={clearFilters} className={`${chip} text-giz/70 underline underline-offset-4`}>Limpar filtros</button>}
          </div>
        </div>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {isLoading ? <PlayerListSkeleton />
            : hasError ? <p className="py-10 text-center text-[15px] text-giz/70">Não foi possível carregar os jogadores. Feche e abra o mercado de novo.</p>
              : visiblePlayers.length === 0 ? <div className="py-12 text-center">
                <p className="text-[15px] font-bold">Nenhum jogador encontrado</p>
                <p className="mt-1 text-sm text-giz/70">Tente outro nome, clube ou faixa de preço.</p>
              </div>
                : <ul className="divide-y divide-border/70">
                  {visiblePlayers.map((player) => {
                    const isSelected = selectedPlayerIds.has(player.id);
                    const isOverBudget = !fitsBudget(player.price, maxAvailablePrice);
                    const isOut = isUnavailable(player.status);
                    const statusText = availabilityText(player.status, player.statusReason);
                    return <li key={player.id}>
                      <button type="button" disabled={isSelected || isOverBudget || isOut} onClick={() => onSelect(player)} className="flex min-h-16 w-full items-center gap-3 py-3 text-left outline-none transition-colors hover:bg-giz/5 focus-visible:bg-giz/5 disabled:cursor-not-allowed disabled:opacity-40">
                        <TeamLogo className="size-9 shrink-0" logoUrl={player.logoUrl} nome={player.clubName} sigla={player.club} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15px] font-bold">{player.name}</p>
                          <p className="mt-0.5 text-[13px] text-giz/65">{isSelected ? "Já escalado" : isOut ? statusText : isOverBudget ? "Fora do orçamento" : player.clubName}</p>
                          <div className="mt-1 flex flex-wrap gap-1 empty:hidden">
                            {!isOut && <PlayerRoleTag role={player.lastGameRole} />}
                            {statusText && !isSelected && <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${isOut ? "bg-destructive text-destructive-foreground" : "bg-warning/20 text-warning"}`}>{isOut ? "Não pode ser escalado" : statusText}</span>}
                          </div>
                        </div>
                        <strong className={`${scoreboard} shrink-0 text-[22px] leading-none text-primary`}>{price(player.price)}</strong>
                      </button>
                    </li>;
                  })}
                </ul>}
        </div>
      </section>
    </div>
  );

  return isMounted ? createPortal(sheet, document.body) : null;
}
