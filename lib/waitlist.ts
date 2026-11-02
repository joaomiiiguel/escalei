export type WaitlistValues = { name: string; whatsapp: string; email: string; consent: boolean; source?: string };
export type WaitlistErrors = Partial<Record<keyof WaitlistValues, string>>;
export type WaitlistEntry = { nome: string; whatsapp: string; email: string; origem: string };

/** Valor padrão de `lista_espera.origem`: cadastro sem `utm_source` no link. */
const DIRECT_SOURCE = "beta";

/** A origem vem da URL pública: fora do formato esperado, conta como acesso direto. */
export function normalizeWaitlistSource(source?: string) {
  const value = source?.trim().toLowerCase() ?? "";
  return /^[a-z0-9_-]{1,40}$/.test(value) ? value : DIRECT_SOURCE;
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

/** Validação compartilhada entre o formulário e a Server Action da lista de espera. */
export function validateWaitlist(values: WaitlistValues): WaitlistErrors {
  const errors: WaitlistErrors = {};
  const digits = onlyDigits(values.whatsapp);
  const name = values.name.trim();

  if (name.length < 2 || name.length > 60) errors.name = "Informe seu nome ou apelido.";
  if (digits.length < 10 || digits.length > 11) errors.whatsapp = "Informe um WhatsApp com DDD.";
  if (values.email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Informe um e-mail válido.";
  if (!values.consent) errors.consent = "Você precisa aceitar o contato sobre o beta.";

  return errors;
}

/** Normaliza os valores já validados para gravação. */
export function toWaitlistEntry(values: WaitlistValues): WaitlistEntry {
  return {
    nome: values.name.trim().replace(/\s+/g, " "),
    whatsapp: onlyDigits(values.whatsapp),
    email: values.email.trim().toLowerCase(),
    origem: normalizeWaitlistSource(values.source),
  };
}

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
