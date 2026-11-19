/**
 * Edge Function: notify-whatsapp
 *
 * Envia por Web Push os avisos do ciclo da rodada, a cada 2 min:
 * 1. Enfileira o aviso de 1 h para a trava (as mudanças de status entram por
 *    gatilho em `rodadas`).
 *    e o aviso de escalação tardia, depois da trava, para quem não escalou.
 * 2. Notifica quem permitiu a notificação da rodada no aparelho, respeitando o
 *    público do aviso (todos, só quem escalou ou só quem não escalou).
 * 3. Avisa o fim de cada jogo (fila em `avisos_jogo`) a quem tem time na rodada,
 *    com o placar e a pontuação dos seus escalados nesse jogo.
 *
 * Trigger: cron a cada 2 min e POST manual.
 * Env obrigatórias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY,
 *                   VAPID_PRIVATE_KEY, VAPID_SUBJECT.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { chunk } from "../_shared/retry.ts";
import { gameEndPayload, playersByUser, type FinishedGame, type LinedUpRow } from "../_shared/game-notices.ts";
import { isExpiredSubscription, noticeRecipients, pushCutoff, pushPayload, type PendingNotice } from "../_shared/whatsapp-notices.ts";

type Subscription = { endpoint: string; usuario_id: string; p256dh: string; auth: string };
type Summary = { avisos: number; jogos: number; inscricoes: number; entregues: number; falhas: number };
type PendingGameNotice = { jogo_id: number; rodada_id: number };
type ClubRef = { sigla: string } | { sigla: string }[] | null;
type GameRow = { id: number; gols_casa: number | null; gols_fora: number | null; clube_casa_id: number; clube_fora_id: number; casa: ClubRef; fora: ClubRef };
type LinedUpQueryRow = { pontos: number | string; pontuado: boolean; times: { usuario_id: string } | { usuario_id: string }[]; jogadores: { nome: string; nome_exibicao: string | null } | { nome: string; nome_exibicao: string | null }[] };

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

const one = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value;

/** Escalados de cada usuário da rodada que jogam por um dos dois clubes do jogo. */
async function loadLinedUpRows(db: SupabaseClient, roundId: number, clubIds: number[]): Promise<LinedUpRow[] | null> {
  const rows: LinedUpRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db.from("times_jogadores")
      .select("pontos, pontuado, times!inner(usuario_id, rodada_id), jogadores!inner(nome, nome_exibicao, clube_id)")
      .eq("times.rodada_id", roundId)
      .in("jogadores.clube_id", clubIds)
      .order("time_id").order("jogador_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) return null;
    for (const row of (data ?? []) as unknown as LinedUpQueryRow[]) {
      const team = one(row.times);
      const player = one(row.jogadores);
      if (!team || !player) continue;
      rows.push({ usuario_id: team.usuario_id, name: player.nome_exibicao || player.nome, points: row.pontuado ? Number(row.pontos) : null });
    }
    if ((data ?? []).length < PAGE_SIZE) return rows;
  }
}

/**
 * Envia o push a cada inscrição, em lotes. As inscrições encerradas pelo
 * navegador vão para `expired`; devolve se ao menos um aparelho recebeu.
 */
async function deliver(recipients: Subscription[], payloadFor: (subscription: Subscription) => string, expired: Set<string>, summary: Summary): Promise<boolean> {
  let delivered = false;
  for (const batch of chunk(recipients)) {
    await Promise.all(batch.filter((subscription) => !expired.has(subscription.endpoint)).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payloadFor(subscription),
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
  return delivered;
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

  const cutoff = pushCutoff(new Date());
  const [{ data: noticesData, error: noticesError }, { data: gameNoticesData, error: gameNoticesError }] = await Promise.all([
    db.from("avisos_whatsapp").select("id, rodada_id, tipo, mensagem, publico").is("push_enviado_em", null).gte("criado_em", cutoff).order("criado_em"),
    db.from("avisos_jogo").select("jogo_id, rodada_id").is("push_enviado_em", null).gte("criado_em", cutoff).order("criado_em"),
  ]);
  if (noticesError) return Response.json({ error: "Não foi possível ler os avisos." }, { status: 500 });
  if (gameNoticesError) return Response.json({ error: "Não foi possível ler os avisos de fim de jogo." }, { status: 500 });
  const notices = (noticesData ?? []) as PendingNotice[];
  const gameNotices = (gameNoticesData ?? []) as PendingGameNotice[];
  if (!notices.length && !gameNotices.length) return Response.json({ avisos: 0, jogos: 0, inscricoes: 0, entregues: 0, falhas: 0 });

  const subscriptions = await loadSubscriptions(db);
  if (!subscriptions) return Response.json({ error: "Não foi possível ler as inscrições." }, { status: 500 });

  const summary: Summary = { avisos: notices.length, jogos: gameNotices.length, inscricoes: subscriptions.length, entregues: 0, falhas: 0 };
  const expired = new Set<string>();
  const usersWithTeamByRound = new Map<number, Set<string>>();
  async function usersWithTeam(roundId: number) {
    if (!usersWithTeamByRound.has(roundId)) {
      const loaded = await loadUsersWithTeam(db, roundId);
      if (!loaded) return null;
      usersWithTeamByRound.set(roundId, loaded);
    }
    return usersWithTeamByRound.get(roundId)!;
  }

  for (const notice of notices) {
    let withTeam = new Set<string>();
    if (notice.publico && notice.publico !== "TODOS" && notice.rodada_id) {
      const loaded = await usersWithTeam(notice.rodada_id);
      if (!loaded) return Response.json({ error: "Não foi possível ler os times da rodada." }, { status: 500 });
      withTeam = loaded;
    }
    const recipients = noticeRecipients(notice, subscriptions, withTeam);
    const delivered = await deliver(recipients, () => pushPayload(notice), expired, summary);
    // Sem destinatário (todos já escalaram, por exemplo), não há o que tentar de novo.
    if (delivered || !recipients.length) {
      const { error } = await db.from("avisos_whatsapp").update({ push_enviado_em: new Date().toISOString() }).eq("id", notice.id);
      if (error) return Response.json({ error: "Não foi possível registrar o push." }, { status: 500 });
    }
  }

  if (gameNotices.length) {
    const { data: gamesData, error: gamesError } = await db.from("jogos")
      .select("id, gols_casa, gols_fora, clube_casa_id, clube_fora_id, casa:clubes!jogos_clube_casa_id_fkey(sigla), fora:clubes!jogos_clube_fora_id_fkey(sigla)")
      .in("id", gameNotices.map((notice) => notice.jogo_id));
    if (gamesError) return Response.json({ error: "Não foi possível ler os jogos encerrados." }, { status: 500 });
    const games = new Map(((gamesData ?? []) as unknown as GameRow[]).map((game) => [game.id, game]));

    for (const notice of gameNotices) {
      const game = games.get(notice.jogo_id);
      const homeSigla = one(game?.casa ?? null)?.sigla;
      const awaySigla = one(game?.fora ?? null)?.sigla;
      if (!game || !homeSigla || !awaySigla) {
        console.error("Aviso de fim de jogo sem jogo ou siglas", notice.jogo_id);
        continue;
      }
      const [withTeam, rows] = await Promise.all([
        usersWithTeam(notice.rodada_id),
        loadLinedUpRows(db, notice.rodada_id, [game.clube_casa_id, game.clube_fora_id]),
      ]);
      if (!withTeam || !rows) return Response.json({ error: "Não foi possível ler os escalados do jogo." }, { status: 500 });

      const finished: FinishedGame = { id: game.id, homeSigla, awaySigla, homeGoals: game.gols_casa, awayGoals: game.gols_fora };
      const linedUp = playersByUser(rows);
      const recipients = noticeRecipients({ publico: "COM_TIME" }, subscriptions, withTeam);
      const delivered = await deliver(recipients, (subscription) => gameEndPayload(finished, linedUp.get(subscription.usuario_id) ?? []), expired, summary);
      if (delivered || !recipients.length) {
        const { error } = await db.from("avisos_jogo").update({ push_enviado_em: new Date().toISOString() }).eq("jogo_id", notice.jogo_id);
        if (error) return Response.json({ error: "Não foi possível registrar o push de fim de jogo." }, { status: 500 });
      }
    }
  }

  for (const batch of chunk([...expired])) await db.from("push_inscricoes").delete().in("endpoint", batch);
  return Response.json(summary);
});
