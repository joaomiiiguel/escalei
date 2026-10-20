import { redirect } from "next/navigation";
import { LineupBuilder, RoundLineup, SavedLineup, type LineupPlayer } from "@/components/ui";
import TitleSection from "@/components/ui/title-section";
import { createClient } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { getCurrentRound } from "@/lib/current-round";
import { displayedKickoff } from "@/lib/game-kickoff";
import { Clock3 } from "lucide-react";
import { Suspense } from "react";

import type { SavedPlayer, SavedTeam, ActiveRound, RoundGame, PlayerStat } from "@/lib/types";

function LineupSkeleton() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 pt-5 px-5 text-foreground">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-[65vh] bg-muted rounded-[14px]" />
        <div className="h-12 bg-muted rounded-xl" />
      </div>
    </main>
  );
}

function matchTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

async function LineupContent({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const leagueMembershipStatus = await getLeagueMembershipStatus(user.id);
  if (leagueMembershipStatus !== "ATIVA") redirect(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`);

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: wallet } = await supabase
    .from("carteiras")
    .select("saldo")
    .eq("usuario_id", user.id)
    .maybeSingle();
  const balance = Number(wallet?.saldo ?? 50);

  const { data: round } = await getCurrentRound<ActiveRound>(
    supabase,
    "id, numero, status, trava_em, fechada_em, simulada",
  );
  const { data: savedTeamData } = round
    ? await supabase.from("times").select("formacao, times_jogadores(jogadores(id, clube_id, nome, nome_exibicao, posicao, preco, clubes(nome, sigla, logo_url)))").eq("usuario_id", user.id).eq("rodada_id", round.id).maybeSingle()
    : { data: null };
  const savedTeam = savedTeamData as unknown as SavedTeam | null;
  const savedPlayers = (savedTeam?.times_jogadores ?? []).flatMap(({ jogadores }) => jogadores ? [jogadores] : []);
  const initialPlayers: LineupPlayer[] = savedPlayers.map((player) => {
    const club = Array.isArray(player.clubes) ? player.clubes[0] : player.clubes;
    return { id: player.id, name: player.nome_exibicao || player.nome, position: player.posicao, price: Number(player.preco), club: club?.sigla ?? "—", clubName: club?.nome ?? "Clube não disponível", logoUrl: club?.logo_url ?? null };
  });

  const playerIds = savedPlayers.map((player) => player.id);
  const [{ data: gamesData }, { data: statsData }] = round && playerIds.length && round.status !== "ABERTA"
    ? await Promise.all([
      supabase.from("jogos").select("id, clube_casa_id, clube_fora_id, inicio_em, inicio_simulado_em, status").eq("rodada_id", round.id),
      supabase.from("estatisticas_jogador").select("jogador_id, pontos, jogos(inicio_em, inicio_simulado_em, status), lido_em").eq("rodada_id", round.id).in("jogador_id", playerIds),
    ])
    : [{ data: [] }, { data: [] }];
  const games = (gamesData ?? []) as RoundGame[];
  const gamesByClub = new Map(games.flatMap((game) => [[game.clube_casa_id, game], [game.clube_fora_id, game]]));
  const statsByPlayer = new Map(((statsData ?? []) as PlayerStat[]).map((stat) => [stat.jogador_id, stat]));
  
  // Calcular última atualização dos pontos (maior lido_em entre os jogadores do time)
  const lastUpdated = statsData && statsData.length > 0
    ? statsData.reduce((max, stat) => {
        const lido = stat.lido_em ? new Date(stat.lido_em).getTime() : 0;
        return lido > max ? lido : max;
      }, 0)
    : 0;
  const lastUpdatedIso = lastUpdated > 0 ? new Date(lastUpdated).toISOString() : null;
  const roundPlayers = initialPlayers.map((player, index) => {
    const savedPlayer = savedPlayers[index];
    const game = gamesByClub.get(savedPlayer?.clube_id);
    const stat = statsByPlayer.get(player.id);
    const statGame = stat?.jogos ? (Array.isArray(stat.jogos) ? stat.jogos[0] : stat.jogos) : null;
    const rawStatus = statGame?.status ?? game?.status ?? "SEM_JOGO";
    const roundStatus: LineupPlayer["roundStatus"] = rawStatus === "ENCERRADO"
      ? "ENCERRADO"
      : rawStatus === "EM_ANDAMENTO"
        ? "EM_ANDAMENTO"
        : rawStatus === "A_JOGAR"
          ? "A_JOGAR"
          : rawStatus === "ADIADO" || rawStatus === "CANCELADO"
            ? "ADIADO"
            : "SEM_JOGO";
    return {
      ...player,
      roundPoints: Number(stat?.pontos ?? 0),
      roundStatus,
      roundLabel: game ? matchTime(displayedKickoff(game)) : "sem jogo",
    };
  });
  const canEdit = round?.status === "ABERTA" && new Date() < new Date(round.trava_em);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 pt-5 px-5 text-foreground">
      {round ? canEdit && (!savedTeam || editar === "1")
        ? <>
          <TitleSection title="Montar time" />
          <LineupBuilder budget={balance} initialFormation={savedTeam?.formacao} initialPlayers={initialPlayers} roundId={round.id} />
        </>
        : savedTeam
          ? round.status === "ABERTA"
            ? <SavedLineup budget={balance} formation={savedTeam.formacao} players={initialPlayers} travaEm={round.trava_em} />
            : <RoundLineup formation={savedTeam.formacao} players={roundPlayers} roundNumber={round.numero} status={round.status} finishedAt={round.fechada_em} lastUpdated={lastUpdatedIso} />
          : <><TitleSection title="Meu time" /><p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">Você não escalou jogadores para esta rodada.</p></>
        : <><TitleSection title="Meu time" /><p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">Não há rodada disponível no momento.</p></>}
    </main>
  );
}

export default async function Lineup({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  return (
    <Suspense fallback={<LineupSkeleton />}>
      <LineupContent searchParams={searchParams} />
    </Suspense>
  );
}
