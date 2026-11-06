import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { getCurrentRound } from "@/lib/current-round";
import { buildChampionshipRanking, leaderGapText, positionChange, rankByPoints, type ChampionshipRowInput } from "@/lib/league-ranking";
import { getAdministratorIds, withoutAdministrators } from "@/lib/league-members";
import { RoundSelector } from "./round-selector";
import { type RankingView } from "./ranking-view-tabs";
import { LeagueHero } from "./league-hero";
import { TrackEvent } from "@/components/analytics/track-event";
import { StandingsTable } from "./standings-table";
import { Logo } from "@/components/ui/logo";
import { quietPanel, scoreboard } from "@/components/ui/scoreboard";

type League = { id: string; nome: string; icone: string | null; tipo: "ABERTA" | "CONVITE"; temporada: number; token_convite: string; arquivada_em: string | null };
type Membership = { entrou_em: string; ligas: League | League[] | null };
type MemberProfile = { apelido: string; clubes: { sigla: string } | { sigla: string }[] | null };
type LeagueMember = { usuario_id: string; perfis: MemberProfile | MemberProfile[] | null };
type Round = { id: number; numero: number; temporada: number; simulada?: boolean; status: "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA"; trava_em: string };
type Team = { usuario_id: string; times_jogadores: { jogador_id: number }[] | null };
type Stat = { jogador_id: number; pontos: number };

function first<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function LeagueDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rodada?: string; visao?: string }> }) {
  const { id } = await params;
  const { rodada: requestedRoundId, visao } = await searchParams;
  const view: RankingView = visao === "campeonato" ? "campeonato" : "rodada";
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const admin = createAdminClient();
  const [leagueMembershipStatus, { data: profile }, { data: membershipData }] = await Promise.all([
    getLeagueMembershipStatus(user.id),
    supabase.from("perfis").select("id").eq("id", user.id).maybeSingle(),
    admin
      .from("ligas_membros")
      .select("entrou_em, ligas(id, nome, icone, tipo, temporada, token_convite, arquivada_em)")
      .eq("liga_id", id)
      .eq("usuario_id", user.id)
      .maybeSingle(),
  ]);
  if (leagueMembershipStatus !== "ATIVA") redirect(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`);
  if (!profile) redirect("/onboarding");

  const membership = membershipData as unknown as Membership | null;
  const league = membership ? first(membership.ligas) : null;
  if (!membership || !league) notFound();
  if (league.arquivada_em) redirect("/ligas?erro=grupo_inativado");

  const [{ data: membersData }, { data: currentRoundData }] = await Promise.all([
    admin.from("ligas_membros").select("usuario_id, perfis!ligas_membros_usuario_id_fkey(apelido, clubes(sigla))").eq("liga_id", league.id).order("entrou_em"),
    getCurrentRound<Round>(admin, "id, numero, temporada, simulada, status, trava_em"),
  ]);
  const leagueMembers = (membersData ?? []) as unknown as LeagueMember[];
  const currentRound = currentRoundData as Round | null;
  const [administratorIds, { data: availableRoundsData }] = await Promise.all([
    getAdministratorIds(admin, leagueMembers.map((member) => member.usuario_id)),
    currentRound
      ? admin
        .from("rodadas")
        .select("id, numero, temporada, simulada, status, trava_em")
        .eq("temporada", currentRound.temporada)
        .eq("simulada", Boolean(currentRound.simulada))
        .in("status", ["ABERTA", "EM_ANDAMENTO", "FECHADA"])
        .order("numero", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);
  const members = withoutAdministrators(leagueMembers, administratorIds).flatMap((member) => {
    const memberProfile = first(member.perfis);
    return memberProfile ? [{ ...member, profile: memberProfile }] : [];
  });
  const availableRounds = (availableRoundsData ?? []) as Round[];
  const requestedRound = Number(requestedRoundId);
  const round = availableRounds.find((candidate) => candidate.id === requestedRound) ?? currentRound;
  const memberIds = members.map((member) => member.usuario_id);
  // Rodada anterior à exibida: base para indicar quem subiu ou desceu no grupo.
  const previousRound = round ? availableRounds.find((candidate) => candidate.numero < round.numero) ?? null : null;
  const [{ data: teamsData }, { data: previousTeamsData }] = await Promise.all([
    view === "rodada" && round && memberIds.length
      ? admin.from("times").select("usuario_id, times_jogadores(jogador_id)").eq("rodada_id", round.id).in("usuario_id", memberIds)
      : Promise.resolve({ data: [] }),
    view === "rodada" && previousRound && memberIds.length
      ? admin.from("times").select("usuario_id, pontos").eq("rodada_id", previousRound.id).in("usuario_id", memberIds)
      : Promise.resolve({ data: null }),
  ]);
  const teams = (teamsData ?? []) as unknown as Team[];
  const playerIds = [...new Set(teams.flatMap((team) => team.times_jogadores?.map((player) => player.jogador_id) ?? []))];
  const { data: statsData } = view === "rodada" && round && playerIds.length
    ? await admin.from("estatisticas_jogador").select("jogador_id, pontos").eq("rodada_id", round.id).in("jogador_id", playerIds)
    : { data: [] };
  const pointsByPlayer = new Map(((statsData ?? []) as Stat[]).map((stat) => [stat.jogador_id, Number(stat.pontos)]));
  const pointsByMember = new Map(teams.map((team) => [team.usuario_id, (team.times_jogadores ?? []).reduce((total, player) => total + (pointsByPlayer.get(player.jogador_id) ?? 0), 0)]));
  const ranking = rankByPoints(members.map((member) => ({ ...member, points: pointsByMember.get(member.usuario_id) ?? 0, isCurrentUser: member.usuario_id === user.id })));

  const previousPointsByMember = new Map(((previousTeamsData ?? []) as { usuario_id: string; pontos: number | string }[]).map((team) => [team.usuario_id, Number(team.pontos)]));
  const previousRoundPositions = previousTeamsData
    ? new Map(rankByPoints(members.map((member) => ({ usuario_id: member.usuario_id, points: previousPointsByMember.get(member.usuario_id) ?? 0 }))).map((member) => [member.usuario_id, member.position]))
    : null;

  const season = currentRound?.temporada ?? league.temporada;
  const lockedRounds = availableRounds.filter((candidate) => candidate.status !== "ABERTA");
  const championshipArgs = { p_liga_id: league.id, p_temporada: season, p_simulada: Boolean(currentRound?.simulada) };
  const [{ data: championshipData, error: championshipError }, { data: previousChampionshipData }] = view === "campeonato"
    ? await Promise.all([
      supabase.rpc("fn_ranking_campeonato", championshipArgs),
      lockedRounds.length > 1
        ? supabase.rpc("fn_ranking_campeonato", { ...championshipArgs, p_ate_numero: lockedRounds[1].numero })
        : Promise.resolve({ data: null }),
    ])
    : [{ data: [], error: null }, { data: null }];
  const previousChampionshipPositions = previousChampionshipData
    ? new Map((previousChampionshipData as ChampionshipRowInput[]).map((row) => [row.usuario_id, row.posicao]))
    : null;
  const championship = buildChampionshipRanking((championshipData ?? []) as ChampionshipRowInput[], user.id);
  const clubByMember = new Map(members.map((member) => [member.usuario_id, first(member.profile.clubes)?.sigla ?? null]));
  const roundCurrentMember = ranking.find((member) => member.isCurrentUser);
  const roundLeader = ranking[0];
  const displayed = view === "campeonato"
    ? {
      rows: championship.ranking.map((member) => ({ ...member, club: clubByMember.get(member.usuario_id) ?? null, detail: `${member.rounds} ${member.rounds === 1 ? "rodada" : "rodadas"}`, change: positionChange(member.position, previousChampionshipPositions?.get(member.usuario_id)) })),
      currentMember: championship.currentMember,
      differenceToLeader: championship.differenceToLeader,
    }
    : {
      rows: ranking.map((member) => ({ usuario_id: member.usuario_id, apelido: member.profile.apelido, club: first(member.profile.clubes)?.sigla ?? null, points: member.points, position: member.position, isCurrentUser: member.isCurrentUser, detail: null as string | null, change: positionChange(member.position, previousRoundPositions?.get(member.usuario_id)) })),
      currentMember: roundCurrentMember,
      differenceToLeader: roundCurrentMember && roundLeader ? Math.max(0, roundLeader.points - roundCurrentMember.points) : null,
    };
  const { currentMember, differenceToLeader } = displayed;
  const joinedDate = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(membership.entrou_em));

  const leaders = displayed.rows.filter((row) => row.position === 1).length;
  const scope = view === "campeonato" ? `no campeonato ${season}` : round ? `na rodada ${round.numero}` : "na liga";
  const rankingTitle = view === "campeonato" ? `Campeonato ${season}` : round ? `Rodada ${round.numero}` : "Classificação";

  return <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pt-4 pb-40 font-(family-name:--font-body) text-giz antialiased">
    <header className="flex items-center justify-between gap-3 pr-12">
      <Logo size="sm" href="/inicio" priority alt="Escalou, início" />
      <Link href="/ligas?lista=1" className="inline-flex min-h-11 items-center gap-1 text-[15px] font-bold text-giz/75 outline-none hover:text-giz focus-visible:ring-2 focus-visible:ring-giz"><ChevronLeft className="size-4" aria-hidden="true" />Minhas ligas</Link>
    </header>

    <LeagueHero
      leagueId={league.id}
      name={league.nome}
      icon={league.icone}
      meta={`${members.length} ${members.length === 1 ? "membro" : "membros"}, ${league.tipo === "CONVITE" ? "por convite" : "aberta"}. Você entrou em ${joinedDate}.`}
      view={view}
      position={currentMember?.position ?? null}
      total={displayed.rows.length}
      scope={scope}
      gap={leaderGapText({ position: currentMember?.position ?? null, differenceToLeader, leaders })}
      points={currentMember?.points ?? null}
    />
    <TrackEvent key={view} event="ranking_visto" properties={{ aba: view }} />

    {members.length === 1 && <p className="flex gap-3 rounded-[14px] border border-warning/40 bg-warning/10 p-3.5 text-[15px] leading-snug text-warning"><Users className="mt-0.5 size-5 shrink-0" aria-hidden="true" />Convide pelo menos 3 amigos. Sozinho você é sempre o primeiro, e isso não tem graça.</p>}

    <section className={`${quietPanel} px-4 pb-4 pt-4`} aria-labelledby="ranking-title">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="ranking-title" className={`${scoreboard} text-[26px] uppercase leading-none`}>{rankingTitle}</h2>
        {view === "rodada" && round && availableRounds.length > 0 && <RoundSelector leagueId={league.id} selectedRoundId={round.id} options={availableRounds.map((candidate) => ({ id: candidate.id, numero: candidate.numero, isCurrent: candidate.id === currentRound?.id }))} />}
      </div>
      {view === "campeonato" && championshipError && <p role="alert" className="rounded-[14px] bg-destructive/40 p-3 text-sm font-semibold text-destructive-foreground">Não foi possível carregar o ranking do campeonato. Tente de novo em instantes.</p>}
      {view === "campeonato" && !championshipError && <p className="mb-1 text-sm text-giz/65">Soma das rodadas já travadas da temporada. No empate, vence quem tiver mais gols dos escalados.</p>}
      {displayed.rows.length === 0
        ? <p className="py-4 text-[15px] text-giz/70">Ninguém pontuou ainda. A tabela aparece quando a primeira rodada travar.</p>
        : <StandingsTable rows={displayed.rows} label={`Classificação, ${rankingTitle}`} />}
    </section>
  </main>;
}
