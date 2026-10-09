import { redirect } from "next/navigation";
import { LineupBuilder, RoundLineup, SavedLineup, type LineupPlayer } from "@/components/ui";
import TitleSection from "@/components/ui/title-section";
import { createClient } from "@/lib/supabase/server";

import type { SavedPlayer, SavedTeam, ActiveRound, RoundGame, PlayerStat } from "@/lib/types";

function matchTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

export default async function Lineup({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const { data: roundData } = await supabase
    .from("rodadas")
    .select("id, numero, status, trava_em, fechada_em")
    .in("status", ["ABERTA", "EM_ANDAMENTO", "FECHADA"])
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  const round = roundData as ActiveRound | null;
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
      supabase.from("jogos").select("id, clube_casa_id, clube_fora_id, inicio_em, status").eq("rodada_id", round.id),
      supabase.from("estatisticas_jogador").select("jogador_id, pontos, jogos(inicio_em, status)").eq("rodada_id", round.id).in("jogador_id", playerIds),
    ])
    : [{ data: [] }, { data: [] }];
  const games = (gamesData ?? []) as RoundGame[];
  const gamesByClub = new Map(games.flatMap((game) => [[game.clube_casa_id, game], [game.clube_fora_id, game]]));
  const statsByPlayer = new Map(((statsData ?? []) as PlayerStat[]).map((stat) => [stat.jogador_id, stat]));
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
      roundLabel: game ? matchTime(game.inicio_em) : "sem jogo",
    };
  });
  const canEdit = round?.status === "ABERTA" && new Date() < new Date(round.trava_em);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 pt-5 px-5 text-foreground">
      {round ? savedTeam
        ? round.status === "ABERTA" && editar === "1" && canEdit
          ? <>
            <TitleSection title="Montar time" />
            <LineupBuilder initialFormation={savedTeam.formacao} initialPlayers={initialPlayers} roundId={round.id} />
          </>
          : round.status === "ABERTA"
            ? <SavedLineup formation={savedTeam.formacao} players={initialPlayers} travaEm={round.trava_em} />
            : <RoundLineup formation={savedTeam.formacao} players={roundPlayers} roundNumber={round.numero} status={round.status} finishedAt={round.fechada_em} />
        : <><TitleSection title="Meu time" /><p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">Você não escalou jogadores para esta rodada.</p></>
        : <><TitleSection title="Meu time" /><p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">Não há rodada disponível no momento.</p></>}
    </main>
  );
}
