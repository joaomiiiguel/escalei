import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { InviteLeagueActions } from "../invite-league-actions";

type League = { id: string; nome: string; icone: string | null; tipo: "ABERTA" | "CONVITE"; temporada: number; token_convite: string };
type Membership = { entrou_em: string; ligas: League | League[] | null };
type MemberProfile = { apelido: string; clubes: { sigla: string } | { sigla: string }[] | null };
type LeagueMember = { usuario_id: string; perfis: MemberProfile | MemberProfile[] | null };
type Round = { id: number; numero: number };
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

export default async function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile } = await supabase.from("perfis").select("id").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");

  const admin = createAdminClient();
  const { data: membershipData } = await admin
    .from("ligas_membros")
    .select("entrou_em, ligas(id, nome, icone, tipo, temporada, token_convite)")
    .eq("liga_id", id)
    .eq("usuario_id", user.id)
    .maybeSingle();
  const membership = membershipData as unknown as Membership | null;
  const league = membership ? first(membership.ligas) : null;
  if (!membership || !league) notFound();

  const [{ data: membersData }, { data: roundData }] = await Promise.all([
    admin.from("ligas_membros").select("usuario_id, perfis!ligas_membros_usuario_id_fkey(apelido, clubes(sigla))").eq("liga_id", league.id).order("entrou_em"),
    admin.from("rodadas").select("id, numero").in("status", ["ABERTA", "EM_ANDAMENTO", "FECHADA"]).order("numero", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const members = ((membersData ?? []) as unknown as LeagueMember[]).flatMap((member) => {
    const memberProfile = first(member.perfis);
    return memberProfile ? [{ ...member, profile: memberProfile }] : [];
  });
  const round = roundData as Round | null;
  const memberIds = members.map((member) => member.usuario_id);
  const { data: teamsData } = round && memberIds.length
    ? await admin.from("times").select("usuario_id, times_jogadores(jogador_id)").eq("rodada_id", round.id).in("usuario_id", memberIds)
    : { data: [] };
  const teams = (teamsData ?? []) as unknown as Team[];
  const playerIds = [...new Set(teams.flatMap((team) => team.times_jogadores?.map((player) => player.jogador_id) ?? []))];
  const { data: statsData } = round && playerIds.length
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
  const currentMember = ranking.find((member) => member.isCurrentUser);
  const leader = ranking[0];
  const differenceToLeader = currentMember && leader ? Math.max(0, leader.points - currentMember.points) : null;
  const joinedDate = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(membership.entrou_em));

  return <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-3.5 px-5 pt-1 pb-40 text-foreground">
    <header className="flex h-12 items-center gap-2.5"><Link href="/ligas?lista=1" className="grid size-9 place-items-center rounded-full bg-card text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Voltar para ligas"><ArrowLeft className="size-[18px]" /></Link><h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold tracking-tight">Ligas</h1></header>

    <section className="flex items-center gap-3.5" aria-labelledby="league-name"><span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-card-foreground text-[28px]">{league.icone || "⚽"}</span><div className="min-w-0"><h2 id="league-name" className="truncate text-[22px] font-extrabold tracking-tight">{league.nome}</h2><p className="mt-1 text-xs text-muted-foreground">{members.length} {members.length === 1 ? "membro" : "membros"} · {league.tipo === "CONVITE" ? "por convite" : "aberta"} · entrou em {joinedDate}</p></div></section>

    <section className="grid grid-cols-3 gap-2" aria-label="Seu desempenho na liga">
      <div className="rounded-xl bg-card px-3 py-2.5"><strong className="block text-lg font-extrabold leading-tight">{currentMember ? `${currentMember.position}º` : "—"}</strong><span className="text-[11px] text-muted-foreground">sua posição</span></div>
      <div className="rounded-xl bg-card px-3 py-2.5"><strong className="block text-lg font-extrabold leading-tight">{currentMember ? points(currentMember.points) : "—"}</strong><span className="text-[11px] text-muted-foreground">seus pontos</span></div>
      <div className="rounded-xl bg-card px-3 py-2.5"><strong className="block text-lg font-extrabold leading-tight">{differenceToLeader === null ? "—" : differenceToLeader === 0 ? "—" : `−${points(differenceToLeader)}`}</strong><span className="text-[11px] text-muted-foreground">para o 1º</span></div>
    </section>

    {members.length === 1 && <section className="flex gap-2 rounded-xl bg-warning/12 p-3 text-xs leading-[1.4] text-warning"><Users className="size-4 shrink-0" aria-hidden="true" />Convide pelo menos 3 amigos. Sozinho você é sempre o primeiro — e isso não tem graça.</section>}

    <section className="grid gap-1" aria-labelledby="ranking-title"><div className="mb-1 flex items-center justify-between"><h2 id="ranking-title" className="text-[17px] font-extrabold">{round ? `Ranking da Rodada ${String(round.numero).padStart(2, "0")}` : "Ranking da liga"}</h2><span className="text-[13px] font-bold text-primary">Ver geral</span></div>
      {ranking.map((member) => {
        const club = first(member.profile.clubes);
        return <article key={member.usuario_id} className={`flex h-[60px] items-center gap-3 rounded-xl px-3 ${member.isCurrentUser ? "border border-primary bg-primary/12" : "bg-card"}`}>
          <strong className="w-8 text-[15px] font-extrabold text-foreground">{member.position}º</strong>
          <span className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-extrabold ${member.isCurrentUser ? "bg-primary text-primary-foreground" : "bg-card-foreground text-muted-foreground"}`}>{initials(member.profile.apelido)}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{member.profile.apelido}{member.isCurrentUser ? " (você)" : ""}</strong><span className="block truncate text-xs text-muted-foreground">{club?.sigla ?? "—"} · {league.nome}</span></span>
          <span className="grid justify-items-end gap-0.5"><strong className="font-mono text-[15px]">{points(member.points)}</strong><span className="text-[11px] font-bold text-muted-foreground">—</span></span>
        </article>;
      })}
    </section>
    <InviteLeagueActions invitePath={`/convite/${league.token_convite}`} leagueName={league.nome} />
  </main>;
}
