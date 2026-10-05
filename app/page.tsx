import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Chip } from "@/components/ui";

const matches = [
  ["São Paulo", "SP", "Flamengo", "FLA", "Hoje · 19:00"],
  ["Palmeiras", "PAL", "Corinthians", "COR", "Hoje · 21:30"],
  ["Bahia", "BAH", "Grêmio", "GRE", "Amanhã · 16:00"],
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase.from("perfis").select("apelido").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: admin } = await supabase.from("administradores").select("usuario_id").eq("usuario_id", user.id).maybeSingle();
  if (admin) redirect("/admin/grupos");
  const firstName = profile?.apelido ?? "escalador";

  return (
    <main className="round-home">
      <header className="round-home__header">
        <div><p>Olá, {firstName} 👋</p><h1>Rodada 01</h1></div>
        <Link className="round-home__avatar" href={user ? "/perfil" : "/entrar"} aria-label="Abrir perfil">{firstName.slice(0, 1).toUpperCase()}</Link>
      </header>

      <section className="round-status" aria-label="Status da rodada">
        <div><Badge tone="success">RODADA ABERTA</Badge><strong>Fecha em 1d 08h</strong></div>
        <p>Escalações válidas até o início do primeiro jogo.</p>
      </section>

      <Card className="round-team" title="Seu time">
        <div className="round-team__empty"><span>⚽</span><div><strong>Você ainda não escalou</strong><p>Monte sua equipe para disputar a rodada.</p></div></div>
        <Link href={user ? "/escalar" : "/entrar"}><Button>Escalar meu time <span aria-hidden="true">→</span></Button></Link>
      </Card>

      <section className="round-section">
        <div className="round-section__heading"><h2>Próximos jogos</h2><Chip active>Brasileirão</Chip></div>
        <div className="match-list">
          {matches.map(([home, homeShort, away, awayShort, date]) => <article className="match" key={`${home}-${away}`}>
            <div className="match__teams"><span>{homeShort}</span><b>{home}</b><i>×</i><b>{away}</b><span>{awayShort}</span></div><time>{date}</time>
          </article>)}
        </div>
      </section>

      <nav className="round-nav" aria-label="Navegação principal"><Link className="active" href="/">⌂<span>Início</span></Link><Link href="/escalar">♟<span>Escalar</span></Link><Link href="/ligas">♜<span>Ligas</span></Link><Link href="/perfil">◉<span>Perfil</span></Link></nav>
    </main>
  );
}
