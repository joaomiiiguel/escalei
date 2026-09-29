import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, BudgetBar, Button, Card, Chip, Toast } from "@/components/ui";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="home">
      <Badge tone="success">RODADA 01 · ABERTA</Badge>
      <h1>Escalei</h1>
      <p>Fantasy futebol sem apostas e sem prêmio.</p>
      <Card title="Seu time começa aqui">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><Chip active>4-3-3</Chip><Chip>C$ 100,00</Chip><Chip>11 jogadores</Chip></div>
        <BudgetBar value={62.4} />
        <Link href={user ? "/perfil" : "/entrar"}><Button>{user ? "Abrir perfil" : "Entrar para escalar"}</Button></Link>
      </Card>
      <Toast>Biblioteca de componentes ativa.</Toast>
    </main>
  );
}
