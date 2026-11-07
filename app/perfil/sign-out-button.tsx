"use client";

import { ChevronRight, Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SignOutButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending || undefined} className="flex min-h-14 w-full items-center gap-3 text-left text-[15px] font-semibold text-giz outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-giz disabled:cursor-wait disabled:opacity-75">
    <LogOut className="size-[19px] text-giz/60" aria-hidden="true" />
    <span className="flex-1">{pending ? "Saindo…" : "Sair da conta"}</span>
    {pending ? <Loader2 className="size-[18px] animate-spin text-giz/60" aria-hidden="true" /> : <ChevronRight className="size-[18px] text-giz/50" aria-hidden="true" />}
  </button>;
}
