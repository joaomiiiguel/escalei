import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { Rodada, Jogo, Clube, TimeDaRodada, EstatisticaDaRodada } from "@/lib/types";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { getCurrentRound } from "@/lib/current-round";
import { displayedKickoff } from "@/lib/game-kickoff";
import { Logo } from "@/components/ui/logo";
import TitleSection from "@/components/ui/title-section";
import StatusRodada from "@/components/page/home/status-round";
import DemoStatusPicker from "@/components/page/home/demo-status-picker";

import RoundViewCTA from "@/components/page/home/round-view-cta";
import MatchesRounds from "@/components/page/home/matches-rounds";
import LiveMatches from "@/components/page/home/live-matches";
import RoundRecapSection from "@/components/page/home/round-recap";
import { TrackEvent } from "@/components/analytics/track-event";
import { hoursSince } from "@/lib/analytics/events";

/** Apelidos que têm acesso ao modo de demonstração. */
const DEMO_USERS = new Set(["Miguel"]);


export default async function Home() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  // Se não estiver logado redireciona para login
  if (!user) redirect("/entrar");

  // Pertencimento ao grupo, perfil e rodada atual são independentes: busca em paralelo.
  const [leagueMembershipStatus, { data: profile }, { data: currentRound, error: currentRoundError }] = await Promise.all([
    getLeagueMembershipStatus(user.id),
    supabase.from("perfis").select("apelido").eq("id", user.id).maybeSingle(),
    getCurrentRound<Rodada>(
      supabase,
      "id, temporada, numero, status, abre_em, trava_em, fechamento_simulado_em, fechada_em, rotulo_api, simulada",
    ),
  ]);

  // Se o grupo não estiver ativo redireciona para entrar
  if (leagueMembershipStatus !== "ATIVA") redirect(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`);

  // Se não tiver perfil redireciona para onboarding
  if (!profile) redirect("/onboarding");

  const round = currentRound;
  const unavailable = Boolean(currentRoundError);
  const now = new Date();
  let team: TimeDaRodada | null = null;
  let games: Jogo[] = [];
  let clubsById = new Map<number, Clube>();
  let teamStats: EstatisticaDaRodada[] = [];

  if (round) {
    // Puxa o time do usuário e os jogos da rodada
    const [{ data: teamData }, { data: gamesData }] = await Promise.all([
      supabase.from("times").select("id, formacao, times_jogadores(jogador_id)").eq("usuario_id", user.id).eq("rodada_id", round.id).maybeSingle(),
      supabase.from("jogos").select("id, clube_casa_id, clube_fora_id, inicio_em, inicio_simulado_em, status, gols_casa, gols_fora, pontuado_em").eq("rodada_id", round.id),
    ]);
    team = teamData as TimeDaRodada | null;
    games = ((gamesData as Jogo[] | null) ?? []).sort((first, second) => new Date(displayedKickoff(first)).getTime() - new Date(displayedKickoff(second)).getTime());
    const clubIds = [...new Set(games.flatMap((game) => [game.clube_casa_id, game.clube_fora_id]))];
    const playerIds = team?.times_jogadores?.map((player) => player.jogador_id) ?? [];
    const hasStats = (round.status === "EM_ANDAMENTO" || round.status === "FECHADA") && playerIds.length > 0;

    // Puxa os clubes da rodada e as estatísticas do time em paralelo
    const [{ data: clubs }, { data: statsData }] = await Promise.all([
      clubIds.length
        ? supabase.from("clubes").select("id, nome, sigla, logo_url").in("id", clubIds)
        : Promise.resolve({ data: null }),
      hasStats
        ? supabase.from("estatisticas_jogador").select("jogador_id, jogo_id, pontos").eq("rodada_id", round.id).in("jogador_id", playerIds)
        : Promise.resolve({ data: null }),
    ]);
    clubsById = new Map(((clubs as Clube[] | null) ?? []).map((club) => [club.id, club]));
    teamStats = (statsData as EstatisticaDaRodada[] | null) ?? [];
  }

  const completedGames = games.filter((game) => game.status === "ENCERRADO");
  const liveGames = games.filter((game) => game.status === "EM_ANDAMENTO");
  const lastCompletedGame = completedGames.at(-1) ?? null;
  const matchLabel = (game: Jogo) => `${clubsById.get(game.clube_casa_id)?.sigla ?? "—"} × ${clubsById.get(game.clube_fora_id)?.sigla ?? "—"}`;

  // ─── Header compartilhado entre modo demo e modo normal ───────────────────
  const header = (
    <header className="flex flex-col items-start justify-between">
      <div className="w-full flex items-center justify-center">
        <Logo size="md" />
      </div>
      <p className="text-sm text-muted-foreground">Olá, {profile.apelido} 👋</p>
      <TitleSection title={round ? `Rodada ${round.numero} - Brasileirão ${round.temporada ?? ""}`.trim() : "Brasileirão"} />
    </header>
  );

  // ─── Modo demonstração (só para apelidos em DEMO_USERS) ───────────────────
  if (DEMO_USERS.has(String(profile.apelido))) {
    return (
      <main className="flex max-w-lg px-5 flex-col justify-start gap-4 pt-5 pb-44 text-white">
        {header}
        <DemoStatusPicker />
      </main>
    );
  }

  // ─── Render normal ────────────────────────────────────────────────────────
  return (
    <main className="flex max-w-lg px-5 flex-col justify-start gap-4 pt-5 pb-44 text-white">
      {header}
      <TrackEvent event="inicio_visto" properties={{ status_rodada: round?.status ?? null }} />
      {team && (round?.status === "EM_ANDAMENTO" || round?.status === "FECHADA") && <TrackEvent event="pontos_vistos" properties={{ status_rodada: round.status, horas_desde_ultimo_jogo: hoursSince(completedGames.map((game) => game.pontuado_em)) }} />}
      {round?.status !== "ABERTA" && <LiveMatches
        completedGames={completedGames.length}
        games={games}
        liveGames={liveGames}
        lastCompletedGame={lastCompletedGame}
        matchLabel={matchLabel}
      />}

      <StatusRodada unavailable={unavailable} round={round} now={now} nextRound={null} />

      {round?.status === "FECHADA" && team && <RoundRecapSection userId={user.id} roundId={round.id} roundNumber={round.numero} stats={teamStats} />}

      <RoundViewCTA team={team} round={round} now={now} games={games} clubsById={clubsById} teamStats={teamStats} />

      <MatchesRounds games={games} clubsById={clubsById} />

    </main>
  )
}
