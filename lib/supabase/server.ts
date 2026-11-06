import { cache } from "react";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (items: { name: string; value: string; options: CookieOptions }[]) => { try { items.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {} } } },
  );
}

/**
 * Usuário autenticado, verificado no servidor do Supabase Auth.
 * `cache` deduplica a chamada dentro do mesmo request (layout + página).
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
