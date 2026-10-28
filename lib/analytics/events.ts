/**
 * Eventos de métrica do Plano de Validação (`obsidion/03-Validacao/Plano de Validação.md`).
 * Os eventos identificam o usuário só pelo id do Supabase: nunca envie e-mail,
 * nome, apelido, telefone ou outro dado pessoal nas propriedades.
 */
export type AnalyticsEvents = {
  cadastro: { via_convite: boolean };
  time_escalado: { formacao: string; segundos: number | null; edicao: boolean };
  inicio_visto: { status_rodada: string | null };
  pontos_vistos: { horas_desde_ultimo_jogo: number | null; status_rodada: string };
  ranking_visto: { aba: "rodada" | "campeonato" };
  convite_aceito: Record<string, never>;
  fim_rodada_compartilhado: { metodo: "nativo" | "copiado" };
  pwa_instalado: { origem: "appinstalled" | "standalone"; plataforma: "ios" | "android" | "outro" };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

export const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

export function posthogConfig(env: Record<string, string | undefined> = process.env) {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  return { key, host: (env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST).replace(/\/+$/, "") };
}

/** Horas inteiras desde o último jogo encerrado, ou `null` quando não há jogo encerrado. */
export function hoursSince(isoDates: Array<string | null | undefined>, now = new Date()): number | null {
  const times = isoDates.flatMap((value) => value ? [new Date(value).getTime()] : []).filter(Number.isFinite);
  if (!times.length) return null;
  return Math.max(0, Math.floor((now.getTime() - Math.max(...times)) / 3_600_000));
}
