"use client";

import { ChevronRight, Loader2, LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SignOutButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending || undefined} className="flex min-h-14 w-full items-center gap-3 px-3.5 text-left text-[14.5px] font-semibold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-75">
    <LogOut className="size-[19px] text-muted-foreground" aria-hidden="true" />
    <span className="flex-1">{pending ? "Saindo…" : "Sair da conta"}</span>
    {pending ? <Loader2 className="size-[18px] animate-spin text-muted-foreground" aria-hidden="true" /> : <ChevronRight className="size-[18px] text-muted-foreground" aria-hidden="true" />}
  </button>;
}
