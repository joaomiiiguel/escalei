/** Valor padrão de `lista_espera.origem`: cadastro sem `utm_source` no link. */
const DIRECT_SOURCE = "beta";

/** Nome da origem no admin. */
export function formatWaitlistSource(source: string) {
  return source === DIRECT_SOURCE ? "Direto" : source;
}

/** Conta as inscrições por origem, da maior para a menor. */
export function countSignupsBySource(entries: { origem: string }[]) {
  const counts = new Map<string, number>();
  for (const { origem } of entries) counts.set(origem, (counts.get(origem) ?? 0) + 1);
  return [...counts].sort(([, a], [, b]) => b - a);
}

/** Formata o WhatsApp gravado só com dígitos: "(11) 98765-4321". */
export function formatWhatsapp(digits: string) {
  const match = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
}

/** Link para abrir conversa no WhatsApp com o DDI do Brasil. */
export function whatsappLink(digits: string, message?: string) {
  const link = `https://wa.me/55${digits}`;
  return message ? `${link}?text=${encodeURIComponent(message)}` : link;
}

/** Mensagem pronta para o admin enviar: o convite só vale para o e-mail autorizado. */
export function waitlistInviteMessage({ nome, grupo, email, link }: { nome: string; grupo: string; email: string; link: string }) {
  return `Oi, ${nome}! Sua vaga no beta do Escalou foi liberada no grupo ${grupo}. Entre por este link usando o e-mail ${email}: ${link}`;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Conta quantas inscrições aconteceram nos últimos 7 dias. */
export function countRecentSignups(entries: { criado_em: string }[], now = new Date()) {
  return entries.filter((entry) => now.getTime() - new Date(entry.criado_em).getTime() <= WEEK_MS).length;
}
