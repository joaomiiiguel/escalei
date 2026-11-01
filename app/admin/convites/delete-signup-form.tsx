"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteWaitlistSignup } from "../actions";

export function DeleteSignupForm({ nome, signupId }: { nome: string; signupId: number }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return <Button type="button" variant="outline" onClick={() => setConfirming(true)} aria-label={`Excluir ${nome}`} className="h-10 px-3"><Trash2 aria-hidden="true" />Excluir</Button>;
  }

  return <form action={deleteWaitlistSignup} className="flex gap-2">
    <input type="hidden" name="inscrito_id" value={signupId} />
    <SubmitButton loadingText="Excluindo…" aria-label={`Confirmar exclusão de ${nome}`} className="h-10 flex-1 bg-destructive px-3 text-destructive-foreground hover:bg-destructive/80">Confirmar</SubmitButton>
    <Button type="button" variant="ghost" onClick={() => setConfirming(false)} className="h-10 px-3">Cancelar</Button>
  </form>;
}
