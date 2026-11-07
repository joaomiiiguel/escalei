"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { disablePush, enablePush, pushFailureMessage, usePushState } from "@/components/pwa/use-push-state";
import { Switch } from "@/components/ui/switch";

const label = "Notificação da rodada";

/** Notificação ligada por padrão em cada aparelho, até o usuário desligar. A permissão pendente é pedida pelo `PushInvite`. */
export function PushToggle({ description, vapidPublicKey }: { description: string; vapidPublicKey?: string }) {
  const state = usePushState(vapidPublicKey);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function toggle(checked: boolean) {
    setBusy(true);
    setFailure(null);
    try {
      await (checked ? enablePush(vapidPublicKey!) : disablePush());
    } catch (error) {
      setFailure(pushFailureMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const unavailable = state === "indisponivel" || state === "bloqueado";

  return <div className="py-3.5">
    <div className="flex min-h-8 items-center gap-3">
      <Bell className="size-5 shrink-0 text-giz/60" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-[15px] font-semibold text-giz">{label}</span>
      <Switch
        aria-label={label}
        checked={!unavailable && state !== "desativado"}
        disabled={busy || unavailable || state === "carregando"}
        onCheckedChange={toggle}
      />
    </div>
    {state === "indisponivel" && <p className="m-0 mt-2 pl-8 text-sm leading-snug text-giz/70">Este navegador não recebe notificações. No iPhone, instale o Escalou na tela de início e abra esta página pelo app.</p>}
    {state === "bloqueado" && <p className="m-0 mt-2 pl-8 text-sm leading-snug text-giz/70">As notificações estão bloqueadas. Libere o Escalou nos ajustes do navegador ou do aparelho.</p>}
    {(state === "pendente" || state === "desativado" || state === "ativado") && <p className="m-0 mt-2 pl-8 text-sm leading-snug text-giz/70">{description}</p>}
    {failure && <p role="alert" className="m-0 mt-2 pl-8 text-sm font-semibold text-destructive-foreground">{failure}</p>}
  </div>;
}
