import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Fonte única da regra "é administrador": ter linha em `administradores`.
 *
 * Use com o cliente do usuário (`lib/supabase/server.ts`): o RLS só deixa
 * cada usuário ler a própria linha. Em caso de erro na consulta, nega
 * (falha fechada) e registra o erro.
 */
export async function isAdministrator(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("administradores")
    .select("usuario_id")
    .eq("usuario_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Falha ao verificar administrador", error);
    return false;
  }
  return Boolean(data);
}

/**
 * Garante que quem acessa a área `/admin` é administrador (JOA-160).
 * Sem sessão vai para `/entrar`; sem registro em `administradores`, para `/inicio`.
 *
 * Chame no layout **e** em cada página e Server Action do admin: no App
 * Router, layout e página renderizam em paralelo, então a checagem do
 * layout sozinha não impede a página de ler dados.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  if (!await isAdministrator(supabase, user.id)) redirect("/inicio");
  return { supabase, user };
}
