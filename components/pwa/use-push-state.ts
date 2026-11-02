"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/perfil/actions";
import { PUSH_TURNED_OFF_KEY, vapidKeyToBytes } from "@/lib/pwa";

export type PushState = "carregando" | "indisponivel" | "bloqueado" | "pendente" | "desativado" | "ativado";

/** O convite da raiz e o interruptor do perfil ficam na mesma tela e precisam concordar. */
const PUSH_CHANGED_EVENT = "escalou:notificacao-alterada";

const failureMessage = "Não foi possível alterar as notificações. Tente novamente.";
const pushServiceFailureMessage = "Este navegador não conseguiu se conectar ao serviço de notificações. Desligue VPN ou bloqueadores e tente de novo. No Brave, ative o push nos ajustes de privacidade.";

export function pushFailureMessage(error: unknown) {
  console.error("Falha ao alterar a notificação da rodada", error);
  return error instanceof DOMException && error.name === "AbortError" ? pushServiceFailureMessage : failureMessage;
}

function wasTurnedOff() {
  try {
    return window.localStorage.getItem(PUSH_TURNED_OFF_KEY) !== null;
  } catch {
    return false;
  }
}

function rememberTurnedOff(turnedOff: boolean) {
  try {
    if (turnedOff) window.localStorage.setItem(PUSH_TURNED_OFF_KEY, "1");
    else window.localStorage.removeItem(PUSH_TURNED_OFF_KEY);
  } catch {
    // Sem armazenamento, o aparelho volta ao padrão ligado.
  }
}

async function subscribe(vapidPublicKey: string) {
  await navigator.serviceWorker.register("/sw.js");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyToBytes(vapidPublicKey) });
  if (await savePushSubscription(subscription.toJSON())) return;
  await subscription.unsubscribe();
  throw new Error("Inscrição de push não salva");
}

async function readPushState(vapidPublicKey?: string): Promise<PushState> {
  if (!vapidPublicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return "indisponivel";
  if (Notification.permission === "denied") return "bloqueado";
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (await registration?.pushManager.getSubscription()) return "ativado";
    if (wasTurnedOff()) return "desativado";
    if (Notification.permission !== "granted") return "pendente";
    await subscribe(vapidPublicKey);
    return "ativado";
  } catch {
    return wasTurnedOff() ? "desativado" : "pendente";
  }
}

export async function enablePush(vapidPublicKey: string) {
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    await subscribe(vapidPublicKey);
    rememberTurnedOff(false);
  }
  window.dispatchEvent(new Event(PUSH_CHANGED_EVENT));
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    if (!await removePushSubscription(subscription.endpoint)) throw new Error("Inscrição de push não removida");
    await subscription.unsubscribe();
  }
  rememberTurnedOff(true);
  window.dispatchEvent(new Event(PUSH_CHANGED_EVENT));
}

export function usePushState(vapidPublicKey?: string) {
  const [state, setState] = useState<PushState>("carregando");

  useEffect(() => {
    const refresh = () => readPushState(vapidPublicKey).then(setState);
    refresh();
    window.addEventListener(PUSH_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(PUSH_CHANGED_EVENT, refresh);
  }, [vapidPublicKey]);

  return state;
}
