import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parsePushSubscription, vapidKeyToBytes } from "@/lib/pwa";
import { isExpiredSubscription, pushCutoff, pushPayload } from "../supabase/functions/_shared/whatsapp-notices";

describe("chave do push", () => {
  it("converte a chave VAPID de base64url para bytes", () => {
    expect([...vapidKeyToBytes("_-8")]).toEqual([255, 239]);
  });
});

describe("inscrição de push", () => {
  const valid = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "chave", auth: "segredo" } };

  it("aceita a inscrição do navegador sem campos extras", () => {
    expect(parsePushSubscription({ ...valid, expirationTime: null })).toEqual({ endpoint: valid.endpoint, p256dh: "chave", auth: "segredo" });
  });

  it.each([
    ["https://web.push.apple.com/abc"],
    ["https://updates.push.services.mozilla.com/wpush/v2/abc"],
    ["https://wns2-par02p.notify.windows.com/w/?token=abc"],
  ])("aceita o serviço de push %s", (endpoint) => {
    expect(parsePushSubscription({ ...valid, endpoint })?.endpoint).toBe(endpoint);
  });

  it.each([
    [null],
    [{}],
    [{ ...valid, endpoint: "http://fcm.googleapis.com/fcm/send/abc" }],
    [{ ...valid, endpoint: "https://exemplo.com/push" }],
    [{ ...valid, endpoint: "https://fcm.googleapis.com.exemplo.com/fcm/send/abc" }],
    [{ ...valid, endpoint: "https://evilpush.apple.com/abc" }],
    [{ ...valid, endpoint: "não é url" }],
    [{ ...valid, endpoint: `https://fcm.googleapis.com/${"a".repeat(1024)}` }],
    [{ ...valid, keys: { p256dh: "", auth: "segredo" } }],
    [{ ...valid, keys: { p256dh: "chave" } }],
  ])("recusa inscrição inválida %#", (value) => {
    expect(parsePushSubscription(value)).toBeNull();
  });
});

describe("push da notify-whatsapp", () => {
  const notice = { id: 7, tipo: "FALTA_1H", mensagem: "⏰ Falta 1 hora! O mercado fecha às 19h00.\nAinda dá tempo." };

  it("manda o usuário para escalar enquanto o mercado está aberto e para a home depois", () => {
    const urlFor = (tipo: string) => JSON.parse(pushPayload({ ...notice, tipo })).url;
    expect(JSON.parse(pushPayload(notice))).toEqual({ title: "⏰ Falta 1 hora!", body: "O mercado fecha às 19h00.\nAinda dá tempo.", tag: "aviso-rodada-7", url: "/escalar" });
    expect(["MERCADO_ABERTO", "FALTA_1H", "MERCADO_FECHADO", "RODADA_ENCERRADA"].map(urlFor)).toEqual(["/escalar", "/escalar", "/", "/"]);
  });

  it("usa o nome do app como título quando o aviso não tem primeira frase", () => {
    expect(JSON.parse(pushPayload({ ...notice, mensagem: "Sem exclamação" }))).toMatchObject({ title: "Escalou", body: "Sem exclamação" });
  });

  it("só tenta notificar avisos da última hora", () => {
    expect(pushCutoff(new Date("2026-11-08T18:00:00Z"))).toBe("2026-11-08T17:00:00.000Z");
  });

  it("descarta só inscrições encerradas pelo navegador", () => {
    expect([404, 410].every(isExpiredSubscription)).toBe(true);
    expect([429, 500, undefined].some(isExpiredSubscription)).toBe(false);
  });

  it("mostra a notificação e abre o destino no service worker", () => {
    const worker = readFileSync(path.resolve(__dirname, "../public/sw.js"), "utf8");
    expect(worker).toContain('addEventListener("push"');
    expect(worker).toContain('addEventListener("notificationclick"');
  });
});
