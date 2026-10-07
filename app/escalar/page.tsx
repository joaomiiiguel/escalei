import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LineupBuilder, SavedLineup } from "@/components/ui";
import TitleSection from "@/components/ui/title-section";

type SavedPlayer = { id: number; nome: string; nome_exibicao: string; posicao: "ATA" | "DEF" | "GOL" | "MEI"; preco: number; clubes: { nome: string; sigla: string; logo_url: string | null } | { nome: string; sigla: string; logo_url: string | null }[] | null };
type SavedTeam = { formacao: "4-3-3" | "4-4-2" | "3-5-2"; times_jogadores: { jogadores: SavedPlayer | null }[] };

export default async function Lineup({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  const { data: round } = await supabase.from("rodadas").select("id, trava_em").eq("status", "ABERTA").gt("trava_em", new Date().toISOString()).order("numero", { ascending: false }).limit(1).maybeSingle();
  const { data: savedTeamData } = round
    ? await supabase.from("times").select("formacao, times_jogadores(jogadores(id, nome, nome_exibicao, posicao, preco, clubes(nome, sigla, logo_url)))").eq("usuario_id", user.id).eq("rodada_id", round.id).maybeSingle()
    : { data: null };
  const savedTeam = savedTeamData as unknown as SavedTeam | null;
  const initialPlayers = (savedTeam?.times_jogadores ?? []).flatMap(({ jogadores }) => {
    if (!jogadores) return [];
    const clube = Array.isArray(jogadores.clubes) ? jogadores.clubes[0] : jogadores.clubes;
    return [{ id: jogadores.id, name: jogadores.nome_exibicao || jogadores.nome, position: jogadores.posicao, price: Number(jogadores.preco), club: clube?.sigla ?? "—", clubName: clube?.nome ?? "Clube não disponível", logoUrl: clube?.logo_url ?? null }];
  });

  return (
    <main className="mx-auto flex h-screen w-full max-w-lg flex-col gap-4 text-foreground">
      {!savedTeam || editar === "1" ? <TitleSection title="Montar time" /> : null}
      {round ? savedTeam && editar !== "1" ? <SavedLineup formation={savedTeam.formacao} players={initialPlayers} travaEm={round.trava_em} /> : <LineupBuilder initialFormation={savedTeam?.formacao} initialPlayers={initialPlayers} roundId={round.id} /> : <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">Não há rodada aberta para escalar no momento.</p>}
    </main>
  );
}
