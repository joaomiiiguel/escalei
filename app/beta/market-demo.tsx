"use client";

import { useState } from "react";

const STARTING_BALANCE = 6000;
const SQUAD_SIZE = 11;

// Valores em centavos de C$. Jogadores fictícios: o mercado real vem da API.
const market = [
  { id: "artilheiro", position: "ATA", name: "O artilheiro do momento", price: 1240 },
  { id: "camisa-10", position: "MEI", name: "O camisa 10 da moda", price: 980 },
  { id: "paredao", position: "GOL", name: "O goleiro paredão", price: 850 },
  { id: "zagueiro", position: "DEF", name: "O zagueiro que faz gol", price: 720 },
  { id: "revelacao", position: "DEF", name: "O lateral revelação", price: 500 },
  { id: "volante", position: "MEI", name: "O volante que ninguém viu", price: 360 },
];

function money(cents: number) {
  return `C$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function MarketDemo() {
  const [signed, setSigned] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState({ count: 0, label: "", refund: false });
  const spent = market.filter((player) => signed.includes(player.id)).reduce((total, player) => total + player.price, 0);
  const balance = STARTING_BALANCE - spent;

  function toggle(id: string, price: number) {
    const refund = signed.includes(id);
    setSigned((current) => (refund ? current.filter((item) => item !== id) : [...current, id]));
    setLastMove((move) => ({ count: move.count + 1, label: `${refund ? "+" : "−"}${money(price)}`, refund }));
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/12 to-white/2 p-6 shadow-[0_30px_80px_rgb(0_0_0/0.3)] ring-1 ring-white/10 lg:sticky lg:top-24 lg:self-start" aria-live="polite">
        <p className="text-base font-semibold text-(--giz-suave)">Seu saldo</p>
        {lastMove.count > 0 ? (
          <span
            key={lastMove.count}
            aria-hidden="true"
            className={`absolute right-6 top-5 text-xl font-bold tabular-nums motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-top-6 motion-safe:fill-mode-forwards motion-safe:delay-300 motion-safe:duration-700 motion-reduce:hidden ${
              lastMove.refund ? "text-(--lima)" : "text-(--giz)"
            }`}
          >
            {lastMove.label}
          </span>
        ) : null}
        <p key={balance} className="font-(family-name:--font-display) text-8xl font-black leading-none tabular-nums bg-gradient-to-b from-[#e4ff66] to-[#2ecc71] bg-clip-text text-transparent sm:text-9xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.34,1.56,0.64,1)]">
          {money(balance)}
        </p>
        <div className="mt-4 grid grid-cols-11 gap-1" aria-hidden="true">
          {Array.from({ length: SQUAD_SIZE }, (_, index) => (
            <span key={index} className={`h-3 rounded-sm transition-colors duration-300 ${index < signed.length ? "bg-(--lima)" : "bg-(--giz-linha)"}`} />
          ))}
        </div>
        <p className="mt-3 text-base text-(--giz-suave)">
          {signed.length} de {SQUAD_SIZE} escalados
          {signed.length === market.length ? `. Sobram ${money(balance)} para as ${SQUAD_SIZE - signed.length} vagas que faltam.` : "."}
        </p>
      </div>

      <div>
        <ul className="border-t border-(--giz-linha)">
          {market.map((player) => {
            const isSigned = signed.includes(player.id);
            return (
              <li key={player.id} className={`flex items-center gap-3 border-b border-(--giz-linha) py-3 transition-colors duration-300 sm:gap-4 ${isSigned ? "bg-gradient-to-r from-transparent to-(--lima)/10" : ""}`}>
                <span className="w-9 shrink-0 font-(family-name:--font-display) text-2xl font-black text-(--giz-suave)">{player.position}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[17px] font-semibold leading-tight">{player.name}</p>
                  <p className="mt-1 text-[15px] tabular-nums text-(--giz-suave)">
                    {money(player.price)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={isSigned}
                  aria-label={`${isSigned ? "Dispensar" : "Contratar"} ${player.name}`}
                  onClick={() => toggle(player.id, player.price)}
                  className={`min-h-11 w-28 shrink-0 rounded-lg text-[15px] font-bold outline-none transition active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-(--gramado) ${
                    isSigned ? "bg-gradient-to-b from-[#e4ff66] to-[#a6e40c] text-primary-foreground" : "bg-(--giz)/10 text-(--giz) hover:bg-(--giz)/20"
                  }`}
                >
                  <span>{isSigned ? "Dispensar" : "Contratar"}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-sm text-(--giz-suave)">Mercado de exemplo, com jogadores fictícios.</p>
      </div>
    </div>
  );
}
