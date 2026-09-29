import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main>
      <h1>Escalei</h1>
      <p>Fantasy futebol sem apostas e sem prêmio.</p>
      {user ? <Link href="/perfil">Abrir perfil</Link> : <Link href="/entrar">Entrar</Link>}
    </main>
  );
}
