import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Garante que quem acessa a área `/admin` é administrador (JOA-160).
 * Sem sessão vai para `/entrar`; sem registro em `administradores`, para `/`.
 *
 * Chame no layout **e** em cada página e Server Action do admin: no App
 * Router, layout e página renderizam em paralelo, então a checagem do
 * layout sozinha não impede a página de ler dados.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  // O RLS só deixa cada usuário ler a própria linha de `administradores`.
  const { data: admin, error } = await supabase
    .from("administradores")
    .select("usuario_id")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (error || !admin) redirect("/");
  return { supabase, user };
}
