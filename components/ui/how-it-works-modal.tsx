"use client";

import { CircleHelp, ShieldCheck, Trophy, Users, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

const steps = [
  ["1", "Monte seu time", "Escolha 11 jogadores e uma das formações permitidas, dentro de C$ 100."],
  ["2", "Salve antes da trava", "Você pode mudar sua escalação até o início do primeiro jogo da rodada."],
  ["3", "Acompanhe a rodada", "Os pontos dos seus jogadores são lançados quando cada jogo termina."],
  ["4", "Compare com os amigos", "Entre em ligas e acompanhe sua posição no ranking da rodada."],
];

const scoring = [["Gol", "+8,0"], ["Assistência", "+5,0"], ["Finalização no gol", "+1,2"], ["Finalização para fora", "+0,8"], ["Desarme", "+1,5"], ["Falta sofrida", "+0,5"], ["Defesa (GOL)", "+1,3"], ["Defesa de pênalti (GOL)", "+7,0"], ["Jogo sem sofrer gol (GOL, DEF)", "+5,0"], ["Gol sofrido (GOL)", "−1,0"], ["Falta cometida", "−0,3"], ["Impedimento", "−0,1"], ["Cartão amarelo", "−1,0"], ["Cartão vermelho", "−3,0"], ["Pênalti perdido", "−4,0"], ["Gol contra", "−3,0"]];

export function HowItWorksModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return <>
    <button type="button" onClick={() => setIsOpen(true)} className="fixed right-5 top-4 z-40 grid size-10 place-items-center rounded-full border border-border bg-card text-foreground shadow-lg outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" aria-label="Como funciona"><CircleHelp className="size-5" /></button>
    {mounted && isOpen && createPortal(<div className="fixed inset-0 z-[80] flex justify-center bg-black/75"><button type="button" className="absolute inset-0" onClick={() => setIsOpen(false)} aria-label="Fechar como funciona" /><section className="relative grid h-dvh w-full max-w-[390px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-background shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="how-it-works-title"><header className="flex items-center justify-between px-4 pb-3 pt-6"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-card text-primary"><CircleHelp className="size-4" /></span><h2 id="how-it-works-title" className="text-lg font-extrabold text-foreground">Como funciona</h2></div><button type="button" onClick={() => setIsOpen(false)} className="grid size-8 place-items-center rounded-full bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Fechar"><X className="size-4" /></button></header><div className="min-h-0 overflow-y-auto px-4 pb-10"><p className="text-[12px] leading-5 text-muted-foreground">O Escalei é grátis, sem apostas, sem prêmio em dinheiro e feito para a rodada de futebol. A disputa é por diversão.</p><section className="mt-5"><h3 className="text-sm font-extrabold text-foreground">Em 4 passos</h3><ol className="mt-2 grid gap-2">{steps.map(([number, title, description]) => <li className="flex gap-2.5 rounded-xl bg-card p-3" key={number}><span className="grid size-5 shrink-0 place-items-center rounded-md bg-primary text-[10px] font-black text-primary-foreground">{number}</span><div><h4 className="text-xs font-extrabold text-foreground">{title}</h4><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{description}</p></div></li>)}</ol></section><section className="mt-4 overflow-hidden rounded-xl bg-card"><div className="flex items-center justify-between border-b border-border px-3 py-2"><div className="flex items-center gap-2"><Trophy className="size-4 text-primary" /><h3 className="text-xs font-extrabold text-foreground">Tabela de pontuação</h3></div><span className="text-[9px] font-bold text-muted-foreground">PONTOS</span></div>{scoring.map(([label, points]) => <div className="flex items-center justify-between border-b border-border/70 px-3 py-1.5 last:border-0" key={label}><span className="text-[10px] text-foreground">{label}</span><strong className={`text-[10px] ${points.startsWith("+") ? "text-primary" : "text-muted-foreground"}`}>{points}</strong></div>)}</section><section className="mt-4"><h3 className="mb-2 text-sm font-extrabold text-foreground">Detalhes que importam</h3><div className="grid gap-2"><div className="flex gap-3 rounded-xl bg-card p-3"><ShieldCheck className="size-4 shrink-0 text-primary" /><div><h4 className="text-xs font-bold text-foreground">A trava</h4><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">A escalação fecha no início do primeiro jogo. Depois disso não dá para mudar.</p></div></div><div className="flex gap-3 rounded-xl bg-card p-3"><Users className="size-4 shrink-0 text-primary" /><div><h4 className="text-xs font-bold text-foreground">Preços e ligas</h4><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Monte seu time com C$ 100 e compare a pontuação com seus amigos.</p></div></div></div></section></div></section></div>, document.body)}
  </>;
}
