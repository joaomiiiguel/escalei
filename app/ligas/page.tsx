import Link from "next/link";
import { ChevronRight, KeyRound, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type League = { id: string; nome: string; icone: string | null; tipo: "ABERTA" | "CONVITE"; temporada: number };
type LeagueMembership = { liga_id: string; ligas: League | League[] | null };

export default async function LeaguesPage({ searchParams }: { searchParams: Promise<{ lista?: string }> }) {
  const { lista } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("ligas_membros")
    .select("liga_id, ligas(id, nome, icone, tipo, temporada)")
    .eq("usuario_id", user.id);
  const leagues = ((memberships ?? []) as unknown as LeagueMembership[]).flatMap((membership) => {
    const league = Array.isArray(membership.ligas) ? membership.ligas[0] : membership.ligas;
    return league ? [league] : [];
  });

  if (!error && leagues.length === 1 && lista !== "1") redirect(`/ligas/${leagues[0].id}`);

  return <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-5 pt-1 pb-36 text-foreground">
    <header className="flex h-12 items-center">
      <h1 className="text-2xl font-extrabold tracking-tight">Ligas</h1>
    </header>
    {error ? <section className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning" role="alert">Não foi possível carregar suas ligas agora. Tente novamente em instantes.</section>
      : leagues.length === 0 ?
        <section className="mx-auto mt-8 flex w-full h-[70vh] max-w-[350px] flex-col items-center justify-center gap-3.5 px-4 py-6 text-center">
          <div className="relative grid size-[104px] place-items-center rounded-full bg-primary/12">
            <span className="grid size-[76px] place-items-center rounded-full border-[1.5px] border-primary/35">
              <Trophy className="size-10 text-primary" aria-hidden="true" />
            </span>
            <span className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border-[3px] border-background bg-warning text-warning-foreground"><KeyRound className="size-[15px]" aria-hidden="true" /></span>
          </div>
          <h2 className="text-lg uppercase font-extrabold">Você ainda não está <br /> em nenhuma liga</h2>
          <p className="text-sm leading-[1.45] text-muted-foreground">Use o código que seu amigo mandou. O ranking fica bem melhor com gente conhecida.</p>
        </section>
        : <section className="mt-4 grid gap-2" aria-label="Minhas ligas">
          {leagues.map((league) => <Link href={`/ligas/${league.id}`} key={league.id} className="flex items-center gap-3 rounded-2xl bg-card p-3.5 outline-none transition hover:bg-card-foreground/55 focus-visible:ring-2 focus-visible:ring-ring">
            <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-card-foreground text-2xl">{league.icone || "⚽"}</span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[15px]">{league.nome}</strong>
              <span className="mt-0.5 block text-xs text-muted-foreground">{league.tipo === "CONVITE" ? "por convite" : "aberta"} · temporada {league.temporada}</span>
            </span>
            <ChevronRight className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>)}
        </section>
    }
  </main>;
}
