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

  return <div className="border-b border-border px-3.5 py-3 last:border-b-0">
    <div className="flex min-h-8 items-center gap-3">
      <Bell className="size-[19px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-[14.5px] font-semibold text-foreground">{label}</span>
      <Switch
        aria-label={label}
        checked={!unavailable && state !== "desativado"}
        disabled={busy || unavailable || state === "carregando"}
        onCheckedChange={toggle}
      />
    </div>
    {state === "indisponivel" && <p className="m-0 mt-2 text-xs leading-5 text-muted-foreground">Este navegador não recebe notificações. No iPhone, instale o Escalou na tela de início e abra esta página pelo app.</p>}
    {state === "bloqueado" && <p className="m-0 mt-2 text-xs leading-5 text-muted-foreground">As notificações estão bloqueadas. Libere o Escalou nos ajustes do navegador ou do aparelho.</p>}
    {(state === "pendente" || state === "desativado" || state === "ativado") && <p className="m-0 mt-2 text-xs leading-5 text-muted-foreground">{description}</p>}
    {failure && <p role="alert" className="m-0 mt-2 text-sm font-semibold text-destructive-foreground">{failure}</p>}
  </div>;
}
