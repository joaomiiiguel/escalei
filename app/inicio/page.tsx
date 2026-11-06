import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { Rodada, Jogo, Clube, TimeDaRodada, EstatisticaDaRodada } from "@/lib/types";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { getCurrentRound } from "@/lib/current-round";
import { displayedKickoff } from "@/lib/game-kickoff";
import { Logo } from "@/components/ui/logo";
import DemoStatusPicker from "@/components/page/home/demo-status-picker";
import MatchesRounds from "@/components/page/home/matches-rounds";
import { RoundHero, RoundHeroEmpty } from "@/components/page/home/round-hero";
import RoundRecapSection from "@/components/page/home/round-recap";
import { isLateLineupOpen } from "@/lib/lineup-rules";
import { roundFigure, roundMessage, roundProgress } from "@/lib/round-home";
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
  const shell = `flex max-w-lg flex-col gap-4 px-4 pt-4 pb-44 font-(family-name:--font-body) text-giz antialiased`;

  // ─── Topo compartilhado entre modo demo e modo normal ─────────────────────
  const header = (
    <header className="flex items-center justify-between gap-3 pr-12">
      <Logo size="sm" href="/inicio" priority alt="Escalou, início" />
      <p className="truncate text-[15px] text-giz/75">Olá, <b className="text-giz">{profile.apelido}</b></p>
    </header>
  );

  // ─── Modo demonstração (só para apelidos em DEMO_USERS) ───────────────────
  if (DEMO_USERS.has(String(profile.apelido))) {
    return (
      <main className={shell}>
        {header}
        <DemoStatusPicker />
      </main>
    );
  }

  // ─── Render normal ────────────────────────────────────────────────────────
  const hasTeam = Boolean(team);
  const lateLineup = !team && isLateLineupOpen(round, games, now);

  return (
    <main className={shell}>
      {header}
      <TrackEvent event="inicio_visto" properties={{ status_rodada: round?.status ?? null }} />
      {team && (round?.status === "EM_ANDAMENTO" || round?.status === "FECHADA") && <TrackEvent event="pontos_vistos" properties={{ status_rodada: round.status, horas_desde_ultimo_jogo: hoursSince(completedGames.map((game) => game.pontuado_em)) }} />}

      {unavailable
        ? <RoundHeroEmpty title="Rodada indisponível" description="Não foi possível carregar a rodada. Confira sua conexão e tente de novo." action={{ label: "Tentar de novo", href: "/inicio" }} />
        : !round
          ? <RoundHeroEmpty title="Sem rodada no momento" description="Quando a próxima rodada for publicada, os jogos e o prazo para escalar aparecem aqui." />
          : <RoundHero
            round={round}
            figure={roundFigure({ round, hasTeam, now })}
            message={roundMessage({ round, hasTeam, lateLineup, now })}
            progress={roundProgress({ games, stats: teamStats, selectedPlayers: team?.times_jogadores?.length ?? 0 })}
            games={games}
            clubsById={clubsById}
            hasTeam={hasTeam}
            now={now}
          />}

      {round?.status === "FECHADA" && team && <RoundRecapSection userId={user.id} roundId={round.id} roundNumber={round.numero} stats={teamStats} />}

      {round && <MatchesRounds games={games} clubsById={clubsById} />}
    </main>
  );
}
