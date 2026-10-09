"use client";

import { Check, ChevronDown, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Club = { id: number; nome: string; sigla: string };
type ProfileEditModalProps = {
  apelido: string;
  clubeCoracaoId: number | null;
  clubs: Club[];
  email: string;
  telefone: string | null;
  updateProfile: (formData: FormData) => void | Promise<void>;
};

export function ProfileEditModal({ apelido, clubeCoracaoId, clubs, email, telefone, updateProfile }: ProfileEditModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return <>
    <button type="button" onClick={() => setIsOpen(true)} className="grid size-9 place-items-center rounded-full bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Editar perfil">
      <Pencil className="size-[18px]" aria-hidden="true" />
    </button>
    {mounted && isOpen && createPortal(
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 sm:items-center" role="presentation">
        <button type="button" aria-label="Fechar edição de perfil" className="absolute inset-0 cursor-default" onClick={() => setIsOpen(false)} />
        <section className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border border-border bg-background px-5 pb-8 pt-4 shadow-2xl sm:rounded-[24px]" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted sm:hidden" />
          <header className="mb-5 flex items-center justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Conta</p><h2 id="edit-profile-title" className="mt-1 text-xl font-extrabold text-foreground">Editar perfil</h2></div>
            <button type="button" onClick={() => setIsOpen(false)} className="grid size-9 place-items-center rounded-full bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Fechar"><X className="size-5" /></button>
          </header>
          <form action={updateProfile} className="m-0 grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>Apelido</span><input name="apelido" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_.]{3,20}" defaultValue={apelido} autoComplete="nickname" className="h-12 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring" /><span className="text-xs font-normal text-muted-foreground">De 3 a 20 caracteres: letras, números, ponto ou _.</span></label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>Time do coração</span><span className="relative"><select name="clube_coracao_id" defaultValue={clubeCoracaoId?.toString() ?? ""} className="h-12 w-full appearance-none rounded-xl border border-border bg-card px-3.5 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"><option value="">Não definido</option>{clubs.map((club) => <option value={club.id} key={club.id}>{club.nome} ({club.sigla})</option>)}</select><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /></span></label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>E-mail</span><input name="email" required type="email" defaultValue={email} autoComplete="email" className="h-12 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring" /><span className="text-xs font-normal text-muted-foreground">Ao alterar, você receberá um e-mail de confirmação.</span></label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>WhatsApp <span className="font-normal text-muted-foreground">(opcional)</span></span><input name="telefone" type="tel" defaultValue={telefone ?? ""} inputMode="tel" autoComplete="tel" placeholder="(85) 99999-9999" className="h-12 rounded-xl border border-border bg-card px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring" /><span className="text-xs font-normal text-muted-foreground">Use um celular brasileiro com DDD.</span></label>
            <button type="submit" className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-extrabold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Check className="size-4" aria-hidden="true" />Salvar alterações</button>
          </form>
        </section>
      </div>,
      document.body,
    )}
  </>;
}
