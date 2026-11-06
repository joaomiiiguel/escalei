import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { Logo } from "@/components/ui/logo";
import { pitchPanel, quietPanel, scoreboard } from "@/components/ui/scoreboard";

type League = { id: string; nome: string; icone: string | null; tipo: "ABERTA" | "CONVITE"; temporada: number; arquivada_em: string | null };
type LeagueMembership = { liga_id: string; ligas: League | League[] | null };

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<{ lista?: string; erro?: string }> }) {
  const { lista, erro } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const [leagueMembershipStatus, { data: profile }] = await Promise.all([
    getLeagueMembershipStatus(user.id),
    supabase.from("perfis").select("id").eq("id", user.id).maybeSingle(),
  ]);
  if (leagueMembershipStatus !== "ATIVA") redirect(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`);
  if (!profile) redirect("/onboarding");

  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("ligas_membros")
    .select("liga_id, ligas(id, nome, icone, tipo, temporada, arquivada_em)")
    .eq("usuario_id", user.id);
  const leagues = ((memberships ?? []) as unknown as LeagueMembership[]).flatMap((membership) => {
    const league = Array.isArray(membership.ligas) ? membership.ligas[0] : membership.ligas;
    return league && !league.arquivada_em ? [league] : [];
  });

  if (!error && leagues.length === 1 && lista !== "1") redirect(`/ligas/${leagues[0].id}`);

  const alert = "rounded-[14px] border border-warning/40 bg-warning/10 p-3.5 text-[15px] leading-snug text-warning";

  return <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pt-4 pb-36 font-(family-name:--font-body) text-giz antialiased">
    <header className="pr-12">
      <Logo size="sm" href="/inicio" priority alt="Escalou, início" />
    </header>
    <h1 className={`${scoreboard} text-[34px] uppercase leading-[0.85]`}>Minhas ligas</h1>
    {erro === "grupo_inativado" && <p className={alert} role="alert">Este grupo foi inativado. Fale com o suporte se precisar de ajuda.</p>}
    {error ? <p className={alert} role="alert">Não foi possível carregar suas ligas agora. Tente de novo em instantes.</p>
      : leagues.length === 0
        ? <section className={`${pitchPanel} p-5`} aria-labelledby="sem-ligas">
          <h2 id="sem-ligas" className={`${scoreboard} text-[28px] uppercase leading-[0.9]`}>Você ainda não está em nenhuma liga</h2>
          <p className="mt-2 text-[15px] leading-snug text-giz/75">Use o código que seu amigo mandou. O ranking fica bem melhor com gente conhecida.</p>
          <Link href="/convite" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-[14px] bg-primary px-5 text-base font-extrabold text-primary-foreground outline-none transition hover:bg-[#d6ff4d] focus-visible:ring-[3px] focus-visible:ring-giz focus-visible:ring-offset-[3px] focus-visible:ring-offset-gramado-escuro">Usar código de convite</Link>
        </section>
        : <ul className={`${quietPanel} divide-y divide-border/70 px-4`} aria-label="Minhas ligas">
          {leagues.map((league) => <li key={league.id}>
            <Link href={`/ligas/${league.id}`} className="-mx-2 flex min-h-[76px] items-center gap-3.5 rounded-xl px-2 py-3 outline-none transition-colors hover:bg-giz/5 focus-visible:ring-2 focus-visible:ring-giz">
              <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-gramado text-2xl">{league.icone || "⚽"}</span>
              <span className="min-w-0 flex-1">
                <strong className={`${scoreboard} block truncate text-[24px] uppercase leading-none`}>{league.nome}</strong>
                <span className="mt-1 block text-[13px] text-giz/65">{league.tipo === "CONVITE" ? "Por convite" : "Aberta"}, temporada {league.temporada}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-giz/50" aria-hidden="true" />
            </Link>
          </li>)}
        </ul>
    }
  </main>;
}
