/**
 * Edge Function: notify-whatsapp
 *
 * Envia por Web Push os avisos do ciclo da rodada, a cada 2 min:
 * 1. Enfileira o aviso de 1 h para a trava (as mudanças de status entram por
 *    gatilho em `rodadas`).
 *    e o aviso de escalação tardia, depois da trava, para quem não escalou.
 * 2. Notifica quem permitiu a notificação da rodada no aparelho, respeitando o
 *    público do aviso (todos, só quem escalou ou só quem não escalou).
 *
 * Trigger: cron a cada 2 min e POST manual.
 * Env obrigatórias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
 *                   VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { chunk } from "../_shared/retry.ts";
import { isExpiredSubscription, noticeRecipients, pushCutoff, pushPayload, type PendingNotice } from "../_shared/whatsapp-notices.ts";

type Subscription = { endpoint: string; usuario_id: string; p256dh: string; auth: string };

const PAGE_SIZE = 1000;
const PUSH_TIMEOUT_MS = 10_000;

/** Usuários com time salvo na rodada, para os avisos que não vão para todos. */
async function loadUsersWithTeam(db: SupabaseClient, roundId: number): Promise<Set<string> | null> {
  const users = new Set<string>();
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db.from("times").select("usuario_id").eq("rodada_id", roundId).order("usuario_id").range(from, from + PAGE_SIZE - 1);
    if (error) return null;
    for (const row of data ?? []) users.add(row.usuario_id as string);
    if ((data ?? []).length < PAGE_SIZE) return users;
  }
}

/** O PostgREST devolve no máximo 1.000 linhas por consulta. */
async function loadSubscriptions(db: SupabaseClient): Promise<Subscription[] | null> {
  const subscriptions: Subscription[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db.from("push_inscricoes").select("endpoint, usuario_id, p256dh, auth").order("endpoint").range(from, from + PAGE_SIZE - 1);
    if (error) return null;
    subscriptions.push(...(data ?? []) as Subscription[]);
    if ((data ?? []).length < PAGE_SIZE) return subscriptions;
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  if (!url || !serviceRoleKey) return Response.json({ error: "Configuração do Supabase incompleta." }, { status: 500 });
  const db = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Vem antes da checagem do VAPID: sem push, o aviso continua registrado.
  const { error: enqueueError } = await db.rpc("fn_enfileirar_aviso_fechamento");
  if (enqueueError) return Response.json({ error: "Não foi possível enfileirar o aviso de fechamento." }, { status: 500 });
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) return Response.json({ error: "Configuração do push incompleta." }, { status: 500 });
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const { data: noticesData, error: noticesError } = await db.from("avisos_whatsapp")
    .select("id, rodada_id, tipo, mensagem, publico").is("push_enviado_em", null).gte("criado_em", pushCutoff(new Date())).order("criado_em");
  if (noticesError) return Response.json({ error: "Não foi possível ler os avisos." }, { status: 500 });
  const notices = (noticesData ?? []) as PendingNotice[];
  if (!notices.length) return Response.json({ avisos: 0, inscricoes: 0, entregues: 0, falhas: 0 });

  const subscriptions = await loadSubscriptions(db);
  if (!subscriptions) return Response.json({ error: "Não foi possível ler as inscrições." }, { status: 500 });

  const summary = { avisos: notices.length, inscricoes: subscriptions.length, entregues: 0, falhas: 0 };
  const expired = new Set<string>();

  for (const notice of notices) {
    let usersWithTeam = new Set<string>();
    if (notice.publico && notice.publico !== "TODOS" && notice.rodada_id) {
      const loaded = await loadUsersWithTeam(db, notice.rodada_id);
      if (!loaded) return Response.json({ error: "Não foi possível ler os times da rodada." }, { status: 500 });
      usersWithTeam = loaded;
    }
    const recipients = noticeRecipients(notice, subscriptions, usersWithTeam);
    let delivered = false;
    for (const batch of chunk(recipients)) {
      await Promise.all(batch.filter((subscription) => !expired.has(subscription.endpoint)).map(async (subscription) => {
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            pushPayload(notice),
            { TTL: 3600, urgency: "high", timeout: PUSH_TIMEOUT_MS },
          );
          delivered = true;
          summary.entregues += 1;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (isExpiredSubscription(statusCode)) expired.add(subscription.endpoint);
          else summary.falhas += 1;
        }
      }));
    }
    // Sem destinatário (todos já escalaram, por exemplo), não há o que tentar de novo.
    if (delivered || !recipients.length) {
      const { error } = await db.from("avisos_whatsapp").update({ push_enviado_em: new Date().toISOString() }).eq("id", notice.id);
      if (error) return Response.json({ error: "Não foi possível registrar o push." }, { status: 500 });
    }
  }

  for (const batch of chunk([...expired])) await db.from("push_inscricoes").delete().in("endpoint", batch);
  return Response.json(summary);
});
