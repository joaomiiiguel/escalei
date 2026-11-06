"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { enablePush, pushFailureMessage, usePushState } from "@/components/pwa/use-push-state";
import { Button } from "@/components/shadcn/button";
import { parseDismissedAt, PUSH_INVITE_COOLDOWN_DAYS, PUSH_INVITE_DISMISSED_KEY } from "@/lib/pwa";

/** Rotas de quem ainda não terminou de entrar: sem perfil, a inscrição não pode ser salva. */
const hiddenPaths = ["/entrar", "/onboarding", "/convite"];

function wasDismissedRecently() {
  try {
    const dismissedAt = parseDismissedAt(window.localStorage.getItem(PUSH_INVITE_DISMISSED_KEY));
    return dismissedAt !== null && Date.now() - dismissedAt < PUSH_INVITE_COOLDOWN_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

function saveDismissedAt() {
  try {
    window.localStorage.setItem(PUSH_INVITE_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Sem armazenamento, o pedido volta na próxima visita.
  }
}

/**
 * Toast da raiz que pede a permissão do navegador, que só libera o push depois de um toque.
 * Depois de dispensado, volta em 14 dias, mas segue aparecendo no perfil, onde fica a opção.
 */
export function PushInvite({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const state = usePushState(vapidPublicKey);
  const pathname = usePathname();
  const [hidden, setHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    setHidden(pathname !== "/perfil" && wasDismissedRecently());
  }, [pathname]);

  if (state !== "pendente" || hidden || hiddenPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;

  const dismiss = () => {
    saveDismissedAt();
    setHidden(true);
  };

  const allow = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await enablePush(vapidPublicKey!);
    } catch (error) {
      setFailure(pushFailureMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return <div className="fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto w-full max-w-lg px-4">
    <aside aria-label="Notificação da rodada" className="grid gap-2 rounded-2xl border border-border bg-secondary px-3.5 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <Bell className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="grid min-w-0 flex-1">
          <strong className="text-sm font-bold">Ative a notificação da rodada</strong>
          <span className="text-xs text-muted-foreground">Avisamos quando o mercado abrir e 1 hora antes de fechar.</span>
        </div>
        <Button type="button" disabled={busy} onClick={allow} className="h-9 rounded-xl px-3.5 font-bold">Permitir</Button>
        <button type="button" onClick={dismiss} aria-label="Dispensar pedido de notificação" className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {failure && <p role="alert" className="m-0 text-xs font-semibold text-destructive-foreground">{failure}</p>}
    </aside>
  </div>;
}
