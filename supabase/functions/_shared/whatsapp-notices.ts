/**
 * Regras do push de `notify-whatsapp`, separadas do acesso ao banco para serem
 * testadas com Vitest. Este módulo não usa globais do Deno.
 */
export type NoticeAudience = "TODOS" | "COM_TIME" | "SEM_TIME";
export type PendingNotice = { id: number; rodada_id?: number; tipo: string; mensagem: string; publico?: NoticeAudience };

/** Depois disso o aviso não sai mais: um "falta 1 hora" atrasado mais atrapalha do que ajuda. */
export const PUSH_MAX_AGE_MINUTES = 60;

export function pushCutoff(now: Date): string {
  return new Date(now.getTime() - PUSH_MAX_AGE_MINUTES * 60_000).toISOString();
}

const MARKET_OPEN = new Set(["MERCADO_ABERTO", "FALTA_1H", "ESCALACAO_TARDIA"]);

/**
 * A primeira frase vira o título: o iPhone já mostra "from Escalou" abaixo dele.
 * A `tag` faz o aparelho substituir, e não duplicar, um aviso reenviado.
 */
export function pushPayload(notice: PendingNotice): string {
  const titleEnd = notice.mensagem.indexOf("!") + 1;
  return JSON.stringify({
    title: titleEnd ? notice.mensagem.slice(0, titleEnd) : "Escalou",
    body: notice.mensagem.slice(titleEnd).trim(),
    tag: `aviso-rodada-${notice.id}`,
    url: MARKET_OPEN.has(notice.tipo) ? "/escalar" : "/inicio",
  });
}

/**
 * Inscrições que recebem o aviso. `usersWithTeam` são os usuários com time salvo
 * na rodada do aviso; só é consultado quando o público não é "TODOS".
 */
export function noticeRecipients<T extends { usuario_id: string }>(
  notice: Pick<PendingNotice, "publico">,
  subscriptions: T[],
  usersWithTeam: Set<string>,
): T[] {
  if (!notice.publico || notice.publico === "TODOS") return subscriptions;
  const withTeam = notice.publico === "COM_TIME";
  return subscriptions.filter((subscription) => usersWithTeam.has(subscription.usuario_id) === withTeam);
}

/** 404 e 410 indicam inscrição encerrada pelo navegador; qualquer outro erro pode ser temporário. */
export const isExpiredSubscription = (statusCode: number | undefined) => statusCode === 404 || statusCode === 410;
