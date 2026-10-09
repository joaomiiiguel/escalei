import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Rodada, Jogo, Clube, TimeDaRodada, EstatisticaDaRodada } from "@/lib/types";
import { ActiveRoundView } from "@/components/active-round-view";
import { DefaultRoundView } from "@/components/default-round-view";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase.from("perfis").select("apelido").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  const { data: admin } = await supabase.from("administradores").select("usuario_id").eq("usuario_id", user.id).maybeSingle();
  if (admin) redirect("/admin/grupos");

  const [{ data: activeRounds, error: activeRoundsError }, { data: scheduledRounds, error: scheduledRoundsError }, { data: closedRounds, error: closedRoundsError }] = await Promise.all([
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em, rotulo_api").in("status", ["ABERTA", "EM_ANDAMENTO"]).order("numero", { ascending: false }).limit(1),
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em, rotulo_api").eq("status", "AGENDADA").order("numero", { ascending: true }).limit(1),
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em, rotulo_api").eq("status", "FECHADA").order("numero", { ascending: false }).limit(1),
  ]);
  const round = ((activeRounds?.[0] ?? scheduledRounds?.[0] ?? closedRounds?.[0]) as Rodada | undefined) ?? null;
  const unavailable = Boolean(activeRoundsError || scheduledRoundsError || closedRoundsError);
  const now = new Date();
  let team: TimeDaRodada | null = null;
  let games: Jogo[] = [];
  let clubsById = new Map<number, Clube>();
  let teamStats: EstatisticaDaRodada[] = [];
  let roundDataUnavailable = false;

  if (round) {
    const [{ data: teamData, error: teamError }, { data: gamesData, error: gamesError }] = await Promise.all([
      supabase.from("times").select("id, formacao, times_jogadores(jogador_id)").eq("usuario_id", user.id).eq("rodada_id", round.id).maybeSingle(),
      supabase.from("jogos").select("id, clube_casa_id, clube_fora_id, inicio_em, status, gols_casa, gols_fora, pontuado_em").eq("rodada_id", round.id).order("inicio_em"),
    ]);
    team = teamData as TimeDaRodada | null;
    games = (gamesData as Jogo[] | null) ?? [];
    roundDataUnavailable = Boolean(teamError || gamesError);
    const clubIds = [...new Set(games.flatMap((game) => [game.clube_casa_id, game.clube_fora_id]))];
    if (clubIds.length) {
      const { data: clubs, error: clubsError } = await supabase.from("clubes").select("id, nome, sigla, logo_url").in("id", clubIds);
      roundDataUnavailable ||= Boolean(clubsError);
      clubsById = new Map(((clubs as Clube[] | null) ?? []).map((club) => [club.id, club]));
    }

    const playerIds = team?.times_jogadores?.map((player) => player.jogador_id) ?? [];
    if (round.status === "EM_ANDAMENTO" && playerIds.length > 0) {
      const { data: statsData, error: statsError } = await supabase
        .from("estatisticas_jogador")
        .select("jogador_id, jogo_id, pontos")
        .eq("rodada_id", round.id)
        .in("jogador_id", playerIds);
      teamStats = (statsData as EstatisticaDaRodada[] | null) ?? [];
      roundDataUnavailable ||= Boolean(statsError);
    }
  }

  if (round?.status === "EM_ANDAMENTO" && !unavailable && !roundDataUnavailable) {
    return <ActiveRoundView round={round} games={games} team={team} teamStats={teamStats} clubsById={clubsById} />;
  }

  return <DefaultRoundView profile={profile} round={round} unavailable={unavailable} roundDataUnavailable={roundDataUnavailable} now={now} team={team} games={games} clubsById={clubsById} />;
}
