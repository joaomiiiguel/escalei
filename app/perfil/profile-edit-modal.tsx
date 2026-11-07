"use client";

import { Check, ChevronDown, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NativeSubmitButton } from "@/components/ui/submit-button";

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
    <button type="button" onClick={() => setIsOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-giz/25 bg-background/50 px-4 text-[15px] font-bold text-giz transition hover:border-giz focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-giz">
      <Pencil className="size-4" aria-hidden="true" />Editar perfil
    </button>
    {mounted && isOpen && createPortal(
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 sm:items-center px-2" role="presentation">
        <button type="button" aria-label="Fechar edição de perfil" className="absolute inset-0 cursor-default" onClick={() => setIsOpen(false)} />
        <section className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] border-t border-gramado bg-background px-5 pb-8 pt-4 font-(family-name:--font-body) text-giz shadow-2xl sm:rounded-[24px] sm:border" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted sm:hidden" />
          <header className="mb-5 flex items-center justify-between gap-3">
            <h2 id="edit-profile-title" className="font-(family-name:--font-display) text-[30px] font-black uppercase leading-none text-giz">Editar perfil</h2>
            <button type="button" onClick={() => setIsOpen(false)} className="grid size-11 place-items-center rounded-full bg-muted text-giz transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-giz" aria-label="Fechar"><X className="size-5" /></button>
          </header>
          <form action={updateProfile} className="m-0 grid gap-4">
            <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>Apelido</span><input name="apelido" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_.]{3,20}" defaultValue={apelido} autoComplete="nickname" className="h-12 rounded-xl border border-border bg-muted/60 px-3.5 text-[15px] text-giz outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring" /><span className="text-[13px] font-normal text-giz/65">De 3 a 20 caracteres: letras, números, ponto ou _.</span></label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>Time do coração</span><span className="relative"><select name="clube_coracao_id" defaultValue={clubeCoracaoId?.toString() ?? ""} className="h-12 w-full appearance-none rounded-xl border border-border bg-muted/60 px-3.5 pr-10 text-[15px] text-giz outline-none transition focus:border-primary focus:ring-2 focus:ring-ring"><option value="">Não definido</option>{clubs.map((club) => <option value={club.id} key={club.id}>{club.nome} ({club.sigla})</option>)}</select><ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /></span></label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>E-mail</span><input name="email" required type="email" defaultValue={email} autoComplete="email" className="h-12 rounded-xl border border-border bg-muted/60 px-3.5 text-[15px] text-giz outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring" /><span className="text-[13px] font-normal text-giz/65">Ao alterar, você receberá um e-mail de confirmação.</span></label>
            <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>WhatsApp <span className="font-normal text-muted-foreground">(opcional)</span></span><input name="telefone" type="tel" defaultValue={telefone ?? ""} inputMode="tel" autoComplete="tel" placeholder="(85) 99999-9999" className="h-12 rounded-xl border border-border bg-muted/60 px-3.5 text-[15px] text-giz outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring" /><span className="text-[13px] font-normal text-giz/65">Use um celular brasileiro com DDD.</span></label>
            <NativeSubmitButton loadingText="Salvando…" className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-extrabold text-primary-foreground transition hover:bg-[#d6ff4d] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-75"><Check className="size-4" aria-hidden="true" />Salvar alterações</NativeSubmitButton>
          </form>
        </section>
      </div>,
      document.body,
    )}
  </>;
}
