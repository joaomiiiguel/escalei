"use client";

import { Check, Copy, Info, MessageCircle, UserPlus, X } from "lucide-react";
import { useState } from "react";

type InviteLeagueActionsProps = {
  invitePath: string;
  leagueName: string;
};

export function InviteLeagueActions({ invitePath, leagueName }: InviteLeagueActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [wasCopied, setWasCopied] = useState(false);
  const inviteUrl = typeof window === "undefined" ? invitePath : `${window.location.origin}${invitePath}`;
  const message = `Vem para a liga ${leagueName} no Escalei! ${inviteUrl}`;

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteUrl);
    setWasCopied(true);
    window.setTimeout(() => setWasCopied(false), 2_000);
  }

  return <>
    <div className="fixed inset-x-0 bottom-[84px] z-40 mx-auto flex w-full max-w-lg gap-2 border-t border-border bg-background px-5 py-3">
      <button type="button" onClick={() => setIsOpen(true)} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"><UserPlus className="size-4" aria-hidden="true" />Convidar</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-extrabold text-[#06200f] outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring"><MessageCircle className="size-4" aria-hidden="true" />WhatsApp</a>
    </div>

    {isOpen && <div className="fixed inset-0 z-[70] flex items-end justify-center" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/65" onClick={() => setIsOpen(false)} aria-label="Fechar convite" />
      <section className="relative z-10 w-full max-w-lg rounded-t-3xl bg-popover px-5 pb-6 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]" role="dialog" aria-modal="true" aria-labelledby="invite-league-title">
        <div className="mx-auto h-[22px] w-full"><span className="mx-auto mt-3 block h-1.5 w-10 rounded-full bg-muted-foreground/70" /></div>
        <header className="flex items-center gap-3"><h2 id="invite-league-title" className="min-w-0 flex-1 text-xl font-extrabold tracking-tight">Convidar para a {leagueName}</h2><button type="button" onClick={() => setIsOpen(false)} className="grid size-9 place-items-center rounded-full bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Fechar"><X className="size-[18px]" /></button></header>
        <p className="mt-4 text-[13px] leading-[1.45] text-muted-foreground">Mande o link para o grupo. Quem abrir entra direto na liga — é grátis e não pede cartão.</p>
        <div className="mt-4 flex items-center gap-3 rounded-[14px] bg-card p-3 pl-3.5">
          <div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold tracking-[0.1em] text-muted-foreground">LINK DA LIGA</p><p className="mt-0.5 truncate font-mono text-sm font-bold text-foreground">{inviteUrl.replace(/^https?:\/\//, "")}</p></div>
          <button type="button" onClick={() => void copyInvite()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-popover px-3 text-xs font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{wasCopied ? <Check className="size-[15px] text-primary" /> : <Copy className="size-[15px]" />}{wasCopied ? "Copiado" : "Copiar"}</button>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-sm font-extrabold text-[#06200f] outline-none focus-visible:ring-2 focus-visible:ring-ring"><MessageCircle className="size-4" aria-hidden="true" />Compartilhar no WhatsApp</a>
        <div className="mt-3 flex gap-2 rounded-xl bg-card px-3 py-2.5 text-xs leading-[1.35] text-muted-foreground"><Info className="size-[15px] shrink-0" aria-hidden="true" />A liga fica boa com 4+ pessoas. Chame o grupo do trabalho inteiro.</div>
      </section>
    </div>}
  </>;
}
