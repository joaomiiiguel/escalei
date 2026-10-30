"use client";

import { Check, Ticket, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/shadcn/button";

const details = [
  "Um passe libera sua escalação em uma rodada, em todos os seus grupos.",
  "Só é usado na trava. Até lá, editar o time não gasta outro.",
  "Vale na temporada da compra e na seguinte.",
  "Se a rodada inteira for cancelada, o passe volta para você.",
];

type PassCountProps = { available: number; exempt?: boolean };

/** Quantidade de passes na linha do título. Ao tocar, explica o passe e oferece a compra. */
export function PassCount({ available, exempt = false }: PassCountProps) {
  const [isOpen, setIsOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => {
    setIsOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        trigger.current?.focus();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return <>
    <button type="button" ref={trigger} onClick={() => setIsOpen(true)} aria-haspopup="dialog" className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary/15 px-3 text-xs font-extrabold text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Ticket className="size-4" aria-hidden="true" />
      Passes: {available}
    </button>
    {isOpen && createPortal(<div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
      <button type="button" className="absolute inset-0" onClick={close} aria-label="Fechar passes de rodada" tabIndex={-1} />
      <section className="relative flex max-h-full w-full max-w-[390px] flex-col gap-5 overflow-y-auto rounded-[20px] bg-secondary px-5 pb-5 pt-2 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="pass-modal-title">
        <header className="flex items-center justify-between">
          <h2 id="pass-modal-title" className="text-[15px] font-extrabold text-foreground">Passe de rodada</h2>
          <button type="button" autoFocus onClick={close} className="-mr-3 grid size-11 place-items-center rounded-full text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Fechar">
            <X className="size-[18px]" aria-hidden="true" />
          </button>
        </header>
        <div className="flex flex-col items-center gap-1.5 pb-2 pt-1 text-center">
          <p className="text-[88px] font-black leading-[0.9] tracking-[-4px] text-primary">{available}</p>
          <p className="text-[13px] font-bold text-secondary-foreground">{available === 1 ? "passe disponível" : "passes disponíveis"}</p>
          {exempt && <p className="mt-1.5 text-xs leading-4 text-secondary-foreground">Nesta rodada, escalar não usa passe.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex h-28 flex-col rounded-[14px] border border-border bg-card p-3.5">
            <p className="text-[13px] font-bold text-secondary-foreground">1 passe</p>
            <p className="mt-auto whitespace-nowrap text-2xl font-black leading-none tracking-[-0.5px] text-foreground"><span className="text-[13px] font-bold tracking-normal">R$</span> 4,99</p>
          </div>
          <div className="flex h-28 flex-col rounded-[14px] border border-primary bg-card p-3.5">
            <p className="text-[13px] font-bold text-secondary-foreground">5 passes</p>
            <p className="mt-auto whitespace-nowrap text-2xl font-black leading-none tracking-[-0.5px] text-primary"><span className="text-[13px] font-bold tracking-normal">R$</span> 19,99</p>
            <p className="mt-1.5 text-[11px] leading-[14px] text-secondary-foreground">R$ 4,00 cada</p>
          </div>
        </div>
        <Button className="h-auto min-h-13 w-full flex-col gap-0.5 rounded-[14px] bg-muted py-2 text-muted-foreground disabled:opacity-100" disabled>
          <span className="text-sm font-extrabold">Comprar passes</span>
          <span className="text-[11px] font-semibold">Disponível em breve</span>
        </Button>
        <ul className="grid gap-2.5 border-t border-border pt-4">
          {details.map((detail) => <li className="flex gap-2.5 text-xs leading-4 text-secondary-foreground" key={detail}>
            <Check className="mt-px size-3.5 shrink-0 text-primary" strokeWidth={3} aria-hidden="true" />
            {detail}
          </li>)}
        </ul>
      </section>
    </div>, document.body)}
  </>;
}
