"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Shirt } from "./shirt";

const STARTING_BALANCE = 6000;
const SQUAD_SIZE = 11;

// Valores em centavos de C$. Jogadores e preços fictícios, só para a demonstração.
export const demoMarket = [
  { id: "gol-pal", position: "GOL", number: 1, club: "PAL", price: 740, change: 30 },
  { id: "def-fla", position: "DEF", number: 4, club: "FLA", price: 610, change: -20 },
  { id: "def-bot", position: "DEF", number: 3, club: "BOT", price: 500, change: 15 },
  { id: "mei-cor", position: "MEI", number: 8, club: "COR", price: 820, change: 45 },
  { id: "mei-sao", position: "MEI", number: 10, club: "SAO", price: 960, change: -10 },
  { id: "ata-fla", position: "ATA", number: 9, club: "FLA", price: 900, change: 60 },
] as const;

function money(cents: number) {
  return `C$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function variation(cents: number) {
  return `${cents >= 0 ? "▲" : "▼"} ${(Math.abs(cents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function MarketDemo() {
  const [signed, setSigned] = useState<string[]>([]);
  const spent = demoMarket.filter((player) => signed.includes(player.id)).reduce((total, player) => total + player.price, 0);
  const balance = STARTING_BALANCE - spent;

  function toggle(id: string) {
    setSigned((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="mt-6 grid gap-4 md:mt-10 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-7">
      <div
        aria-live="polite"
        className="sticky top-[76px] z-10 rounded-2xl border-[1.5px] border-primary bg-card p-4 shadow-[0_0_30px_rgb(197_249_32/0.14)] md:order-last md:top-28 md:border-2 md:p-6"
      >
        <div className="flex items-end justify-between gap-4 md:block">
          <div>
            <p className="text-xs font-bold uppercase tracking-[1.5px] text-muted-foreground">Saldo</p>
            <p className="font-(family-name:--font-display) text-[44px] font-black leading-none tabular-nums text-primary md:text-[84px]">{money(balance)}</p>
          </div>
          <dl className="text-right text-[13px] text-muted-foreground md:mt-4 md:grid md:gap-1.5 md:text-left md:text-base">
            <div className="md:flex md:justify-between">
              <dt className="inline md:block">Gasto </dt>
              <dd className="inline font-bold tabular-nums text-(--giz) md:block">{money(spent)}</dd>
            </div>
            <div className="md:flex md:justify-between">
              <dt className="sr-only md:not-sr-only">Escalados</dt>
              <dd className="tabular-nums">
                <strong className="text-(--giz)">{signed.length}</strong> de {SQUAD_SIZE} escalados
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-3 grid grid-cols-11 gap-1" aria-hidden="true">
          {Array.from({ length: SQUAD_SIZE }, (_, index) => (
            <span key={index} className={`h-2 rounded-full transition-colors duration-300 md:h-2.5 ${index < signed.length ? "bg-primary" : "bg-(--gramado-escuro)"}`} />
          ))}
        </div>
        <div className="mt-2 flex min-h-11 items-center justify-between gap-2">
          <p className="text-[13px] text-muted-foreground md:text-[15px]">
            {signed.length === 0 ? "Toque nos jogadores pra montar seu time." : `Sobra ${money(balance)} pra completar os ${SQUAD_SIZE}.`}
          </p>
          {signed.length > 0 && (
            <button
              type="button"
              onClick={() => setSigned([])}
              className="min-h-11 shrink-0 rounded-[10px] border border-border px-3 text-sm font-bold text-muted-foreground outline-none transition hover:border-(--giz) hover:text-(--giz) focus-visible:ring-2 focus-visible:ring-(--giz)"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
        {demoMarket.map((player) => {
          const isSigned = signed.includes(player.id);
          return (
            <li key={player.id}>
              <button
                type="button"
                aria-pressed={isSigned}
                aria-label={`${isSigned ? "Tirar do time" : "Colocar no time"}: ${player.position} do ${player.club}, camisa ${player.number}, ${money(player.price)}`}
                onClick={() => toggle(player.id)}
                className={`flex w-full flex-col gap-2 rounded-[14px] border-2 p-3 text-left outline-none transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-(--giz) focus-visible:ring-offset-2 focus-visible:ring-offset-background md:gap-3 md:rounded-2xl md:p-[18px] ${
                  isSigned ? "border-primary bg-(--gramado) shadow-[0_0_22px_rgb(197_249_32/0.28)]" : "border-border bg-card hover:border-(--giz)/50"
                }`}
              >
                <span className="flex items-center justify-between">
                  <Shirt number={player.number} goalkeeper={player.position === "GOL"} className="size-[38px] text-[13px] md:size-[52px] md:text-[17px]" />
                  <span className={`flex h-6 items-center rounded-md px-2 text-xs font-extrabold tracking-[0.5px] md:h-7 md:text-sm ${isSigned ? "bg-card" : "bg-(--gramado)"}`}>{player.position}</span>
                </span>
                <span className="text-[13px] font-bold text-muted-foreground md:text-[15px]">
                  {player.club} · camisa {player.number}
                </span>
                <span className="flex items-baseline justify-between">
                  <span className="text-xl font-extrabold tabular-nums md:text-[26px]">{money(player.price)}</span>
                  <span className={`text-xs font-bold tabular-nums md:text-sm ${player.change >= 0 ? "text-primary" : "text-muted-foreground"}`}>{variation(player.change)}</span>
                </span>
                {isSigned ? (
                  <span className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-extrabold text-primary-foreground md:h-10 md:text-[15px]">
                    <Check className="size-4" aria-hidden="true" strokeWidth={3} />
                    Escalado
                  </span>
                ) : (
                  <span className="flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border text-sm font-extrabold md:h-10 md:text-[15px]">
                    <Plus className="size-4" aria-hidden="true" strokeWidth={3} />
                    Escalar
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
