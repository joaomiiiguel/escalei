import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Administradores entram em `ligas_membros` ao criar um grupo, mas não disputam:
 * não aparecem em rankings nem contam como membros.
 */
export function withoutAdministrators<T extends { usuario_id: string }>(rows: T[], administratorIds: Set<string>): T[] {
  return rows.filter((row) => !administratorIds.has(row.usuario_id));
}

/** Ids de administradores entre os usuários informados (use com o cliente administrativo). */
export async function getAdministratorIds(admin: SupabaseClient, userIds: string[]): Promise<Set<string>> {
  if (!userIds.length) return new Set();
  const { data } = await admin.from("administradores").select("usuario_id").in("usuario_id", userIds);
  return new Set((data ?? []).map((row) => row.usuario_id as string));
}
