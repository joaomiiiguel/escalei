import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { getCurrentRound } from "@/lib/current-round";
import { buildChampionshipRanking, type ChampionshipRowInput } from "@/lib/league-ranking";
import { getAdministratorIds, withoutAdministrators } from "@/lib/league-members";
import { RoundSelector } from "./round-selector";
import { RankingViewTabs, type RankingView } from "./ranking-view-tabs";
import { TrackEvent } from "@/components/analytics/track-event";
import { Logo } from "@/components/ui";

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

function initials(value: string) {
  return value.split(/[.\s_-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("pt-BR") || "—";
}

function points(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default async function LeagueDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rodada?: string; visao?: string }> }) {
  const { id } = await params;
  const { rodada: requestedRoundId, visao } = await searchParams;
  const view: RankingView = visao === "campeonato" ? "campeonato" : "rodada";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const leagueMembershipStatus = await getLeagueMembershipStatus(user.id);
  if (leagueMembershipStatus !== "ATIVA") redirect(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`);

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const admin = createAdminClient();
  const { data: membershipData } = await admin
    .from("ligas_membros")
    .select("entrou_em, ligas(id, nome, icone, tipo, temporada, token_convite, arquivada_em)")
    .eq("liga_id", id)
    .eq("usuario_id", user.id)
    .maybeSingle();
  const membership = membershipData as unknown as Membership | null;
  const league = membership ? first(membership.ligas) : null;
  if (!membership || !league) notFound();
  if (league.arquivada_em) redirect("/ligas?erro=grupo_inativado");

  const [{ data: membersData }, { data: currentRoundData }] = await Promise.all([
    admin.from("ligas_membros").select("usuario_id, perfis!ligas_membros_usuario_id_fkey(apelido, clubes(sigla))").eq("liga_id", league.id).order("entrou_em"),
    getCurrentRound<Round>(admin, "id, numero, temporada, simulada, status, trava_em"),
  ]);
  const leagueMembers = (membersData ?? []) as unknown as LeagueMember[];
  const administratorIds = await getAdministratorIds(admin, leagueMembers.map((member) => member.usuario_id));
  const members = withoutAdministrators(leagueMembers, administratorIds).flatMap((member) => {
    const memberProfile = first(member.perfis);
    return memberProfile ? [{ ...member, profile: memberProfile }] : [];
  });
  const currentRound = currentRoundData as Round | null;
  const { data: availableRoundsData } = currentRound
    ? await admin
      .from("rodadas")
      .select("id, numero, temporada, simulada, status, trava_em")
      .eq("temporada", currentRound.temporada)
      .eq("simulada", Boolean(currentRound.simulada))
      .in("status", ["ABERTA", "EM_ANDAMENTO", "FECHADA"])
      .order("numero", { ascending: false })
    : { data: [] };
  const availableRounds = (availableRoundsData ?? []) as Round[];
  const requestedRound = Number(requestedRoundId);
  const round = availableRounds.find((candidate) => candidate.id === requestedRound) ?? currentRound;
  const memberIds = members.map((member) => member.usuario_id);
  const { data: teamsData } = view === "rodada" && round && memberIds.length
    ? await admin.from("times").select("usuario_id, times_jogadores(jogador_id)").eq("rodada_id", round.id).in("usuario_id", memberIds)
    : { data: [] };
  const teams = (teamsData ?? []) as unknown as Team[];
  const playerIds = [...new Set(teams.flatMap((team) => team.times_jogadores?.map((player) => player.jogador_id) ?? []))];
  const { data: statsData } = view === "rodada" && round && playerIds.length
    ? await admin.from("estatisticas_jogador").select("jogador_id, pontos").eq("rodada_id", round.id).in("jogador_id", playerIds)
    : { data: [] };
  const pointsByPlayer = new Map(((statsData ?? []) as Stat[]).map((stat) => [stat.jogador_id, Number(stat.pontos)]));
  const pointsByMember = new Map(teams.map((team) => [team.usuario_id, (team.times_jogadores ?? []).reduce((total, player) => total + (pointsByPlayer.get(player.jogador_id) ?? 0), 0)]));
  const orderedRanking = members
    .map((member) => ({ ...member, points: pointsByMember.get(member.usuario_id) ?? 0, isCurrentUser: member.usuario_id === user.id }))
    .sort((firstMember, secondMember) => secondMember.points - firstMember.points);
  let lastPoints: number | null = null;
  let lastPosition = 0;
  const ranking = orderedRanking.map((member, index) => {
    const position = member.points === lastPoints ? lastPosition : index + 1;
    lastPoints = member.points;
    lastPosition = position;
    return { ...member, position };
  });
  const season = currentRound?.temporada ?? league.temporada;
  const { data: championshipData, error: championshipError } = view === "campeonato"
    ? await supabase.rpc("fn_ranking_campeonato", { p_liga_id: league.id, p_temporada: season, p_simulada: Boolean(currentRound?.simulada) })
    : { data: [], error: null };
  const championship = buildChampionshipRanking((championshipData ?? []) as ChampionshipRowInput[], user.id);
  const roundCurrentMember = ranking.find((member) => member.isCurrentUser);
  const roundLeader = ranking[0];
  const displayed = view === "campeonato"
    ? {
      rows: championship.ranking.map((member) => ({ ...member, detail: `${member.rounds} ${member.rounds === 1 ? "rodada" : "rodadas"}` })),
      currentMember: championship.currentMember,
      differenceToLeader: championship.differenceToLeader,
    }
    : {
      rows: ranking.map((member) => ({ usuario_id: member.usuario_id, apelido: member.profile.apelido, points: member.points, position: member.position, isCurrentUser: member.isCurrentUser, detail: null as string | null })),
      currentMember: roundCurrentMember,
      differenceToLeader: roundCurrentMember && roundLeader ? Math.max(0, roundLeader.points - roundCurrentMember.points) : null,
    };
  const { currentMember, differenceToLeader } = displayed;
  const joinedDate = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(membership.entrou_em));

  return <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-3.5 px-5 pt-1 pb-40 text-foreground">
    {/* <header className="flex h-12 items-center gap-2.5"><Link href="/ligas?lista=1" className="grid size-9 place-items-center rounded-full bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Voltar para ligas"><ArrowLeft className="size-[18px]" /></Link><h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight">Ligas</h1></header> */}
    <div className="w-full flex items-center justify-center">
      <Logo size="md" />
    </div>
    <section className="flex items-center gap-3.5" aria-labelledby="league-name">
      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/30 text-[28px]">{league.icone || "⚽"}</span>
      <div className="min-w-0">
        <h2 id="league-name" className="truncate text-[22px] font-extrabold tracking-tight">{league.nome}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{members.length} {members.length === 1 ? "membro" : "membros"} · {league.tipo === "CONVITE" ? "por convite" : "aberta"} · entrou em {joinedDate}</p>
      </div>
    </section>

    <RankingViewTabs leagueId={league.id} active={view} />
    <TrackEvent key={view} event="ranking_visto" properties={{ aba: view }} />

    <section className="grid grid-cols-3 gap-4" aria-label={view === "campeonato" ? "Seu desempenho no campeonato" : "Seu desempenho na rodada"}>
      <div className="rounded-xl bg-secondary px-3 py-2.5 text-center"><strong className="block text-3xl font-mono text-primary font-extrabold leading-tight">{currentMember ? `${currentMember.position}º` : "—"}</strong><span className="text-[11px] font-mono text-white">sua posição</span></div>
      <div className="rounded-xl bg-secondary px-3 py-2.5 text-center"><strong className="block text-3xl font-mono text-primary font-extrabold leading-tight">{currentMember ? points(currentMember.points) : "—"}</strong><span className="text-[11px] font-mono text-white">seus pontos</span></div>
      <div className="rounded-xl bg-secondary px-3 py-2.5 text-center"><strong className="block text-3xl font-mono text-primary font-extrabold leading-tight">{differenceToLeader === null ? "—" : differenceToLeader === 0 ? "—" : `−${points(differenceToLeader)}`}</strong><span className="text-[11px] font-mono text-white">para o 1º</span></div>
    </section>

    {members.length === 1 && <section className="flex gap-2 rounded-xl bg-warning/12 p-3 text-xs leading-[1.4] text-warning"><Users className="size-4 shrink-0" aria-hidden="true" />Convide pelo menos 3 amigos. Sozinho você é sempre o primeiro — e isso não tem graça.</section>}

    <section className="grid gap-1" aria-labelledby="ranking-title">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 id="ranking-title" className="text-[17px] font-extrabold">{view === "campeonato" ? `Ranking do Campeonato ${season}` : round ? `Ranking da Rodada ${String(round.numero).padStart(2, "0")}` : "Ranking da liga"}</h2>
        {view === "rodada" && round && availableRounds.length > 0 && <RoundSelector leagueId={league.id} selectedRoundId={round.id} options={availableRounds.map((candidate) => ({ id: candidate.id, numero: candidate.numero, isCurrent: candidate.id === currentRound?.id }))} />}
      </div>
      <div className="my-2 flex items-center justify-between gap-3 opacity-60">
        <p className="w-12 text-xs font-extrabold font-mono">POS</p>
        <p className="flex-1 text-xs font-extrabold">NOME</p>
        <p className="w-10 text-xs font-extrabold font-mono">PTS</p>
      </div>
      {view === "campeonato" && championshipError && <p role="alert" className="rounded-xl bg-destructive/20 p-3 text-sm font-semibold text-destructive-foreground">Não foi possível carregar o ranking do campeonato. Tente novamente em instantes.</p>}
      {view === "campeonato" && !championshipError && <p className="text-xs text-muted-foreground">Soma dos pontos de todas as rodadas já travadas da temporada. Empate: mais gols dos escalados.</p>}
      {displayed.rows.map((member) => {
        return <article key={member.usuario_id} className={`flex h-[60px] items-center gap-3 rounded-xl px-3 backdrop-blur-sm ${member.isCurrentUser ? "border border-primary bg-primary/15" : "bg-primary/10"}`}>
          <strong className="w-8 text-[15px] font-extrabold text-foreground">{member.position}º</strong>
          <span className="min-w-0 flex-1"><strong className="block truncate">{member.apelido}{member.isCurrentUser ? " (você)" : ""}</strong>{member.detail && <span className="block text-xs text-muted-foreground">{member.detail}</span>}</span>
          <span className="grid justify-items-end gap-0.5"><strong className="font-mono text-[15px]">{points(member.points)}</strong></span>
        </article>;
      })}
    </section>
  </main>;
}
