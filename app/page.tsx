import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ChevronRight, CircleUserRound, ShieldCheck, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type StatusRodada = "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA";
type StatusJogo = "A_JOGAR" | "EM_ANDAMENTO" | "ENCERRADO" | "ADIADO" | "CANCELADO";
type Rodada = { id: number; numero: number; status: StatusRodada; abre_em: string | null; trava_em: string; fechada_em: string | null };
type Jogo = { id: number; clube_casa_id: number; clube_fora_id: number; inicio_em: string; status: StatusJogo; gols_casa: number | null; gols_fora: number | null; pontuado_em: string | null };
type Clube = { id: number; nome: string; sigla: string };

const saoPaulo = "America/Sao_Paulo";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: saoPaulo, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: saoPaulo, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function roundPresentation(round: Rodada, now: Date) {
  const isLocked = now >= new Date(round.trava_em);
  if (round.status === "AGENDADA") return { label: "RODADA AINDA NÃO ABERTA", title: "Mercado ainda fechado", description: round.abre_em ? `A abertura está prevista para ${formatDateTime(round.abre_em)}.` : "A abertura do mercado ainda não foi definida." };
  if (round.status === "ABERTA" && !isLocked) return { label: "MERCADO ABERTO", title: `Trava em ${formatDateTime(round.trava_em)}`, description: "Escalações válidas até o início do primeiro jogo." };
  if (round.status === "FECHADA") return { label: "RODADA FECHADA", title: "Mercado fechado", description: round.fechada_em ? `Rodada encerrada em ${formatDateTime(round.fechada_em)}.` : "A rodada foi encerrada." };
  return { label: "RODADA EM ANDAMENTO", title: `Mercado fechado desde ${formatDateTime(round.trava_em)}`, description: "Os pontos aparecem após o encerramento de cada jogo." };
}

function teamPresentation(hasTeam: boolean, round: Rodada, now: Date) {
  const canEdit = round.status === "ABERTA" && now < new Date(round.trava_em);
  if (!hasTeam && canEdit) return { title: "Você ainda não escalou", description: "Monte sua equipe para disputar esta rodada.", cta: "Montar meu time" };
  if (hasTeam && canEdit) return { title: "Seu time está escalado", description: `Você pode editar até ${formatDateTime(round.trava_em)}.`, cta: "Editar meu time" };
  if (hasTeam && round.status === "EM_ANDAMENTO") return { title: "Seu time está acompanhando a rodada", description: "Os pontos são lançados quando cada jogo termina.", cta: "Ver meu time" };
  if (hasTeam) return { title: "Seu time está travado", description: "A escalação não pode mais ser alterada nesta rodada.", cta: "Ver meu time" };
  return { title: "Nenhum time escalado nesta rodada", description: "Acompanhe a próxima rodada para montar sua equipe.", cta: null };
}

function gameStatus(game: Jogo) {
  if (game.status === "EM_ANDAMENTO") return "Em andamento · sem parcial";
  if (game.status === "ADIADO") return "Adiado";
  if (game.status === "CANCELADO") return "Cancelado";
  if (game.status === "ENCERRADO") {
    if (!game.pontuado_em) return "Encerrado · pontuação em breve";
    if (game.gols_casa !== null && game.gols_fora !== null) return `${game.gols_casa} × ${game.gols_fora} · pontuado`;
    return "Encerrado · pontuado";
  }
  return formatDate(game.inicio_em);
}

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase.from("perfis").select("apelido").eq("id", user.id).maybeSingle();
  if (!profile) redirect("/onboarding");
  const { data: admin } = await supabase.from("administradores").select("usuario_id").eq("usuario_id", user.id).maybeSingle();
  if (admin) redirect("/admin/grupos");

  const [{ data: activeRounds, error: activeRoundsError }, { data: scheduledRounds, error: scheduledRoundsError }, { data: closedRounds, error: closedRoundsError }] = await Promise.all([
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em").in("status", ["ABERTA", "EM_ANDAMENTO"]).order("numero", { ascending: false }).limit(1),
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em").eq("status", "AGENDADA").order("numero", { ascending: true }).limit(1),
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em").eq("status", "FECHADA").order("numero", { ascending: false }).limit(1),
  ]);
  const round = ((activeRounds?.[0] ?? scheduledRounds?.[0] ?? closedRounds?.[0]) as Rodada | undefined) ?? null;
  const unavailable = Boolean(activeRoundsError || scheduledRoundsError || closedRoundsError);
  const now = new Date();
  let team: { id: string } | null = null;
  let games: Jogo[] = [];
  let clubsById = new Map<number, Clube>();
  let roundDataUnavailable = false;

  if (round) {
    const [{ data: teamData, error: teamError }, { data: gamesData, error: gamesError }] = await Promise.all([
      supabase.from("times").select("id").eq("usuario_id", user.id).eq("rodada_id", round.id).maybeSingle(),
      supabase.from("jogos").select("id, clube_casa_id, clube_fora_id, inicio_em, status, gols_casa, gols_fora, pontuado_em").eq("rodada_id", round.id).order("inicio_em"),
    ]);
    team = teamData as { id: string } | null;
    games = (gamesData as Jogo[] | null) ?? [];
    roundDataUnavailable = Boolean(teamError || gamesError);
    const clubIds = [...new Set(games.flatMap((game) => [game.clube_casa_id, game.clube_fora_id]))];
    if (clubIds.length) {
      const { data: clubs, error: clubsError } = await supabase.from("clubes").select("id, nome, sigla").in("id", clubIds);
      roundDataUnavailable ||= Boolean(clubsError);
      clubsById = new Map(((clubs as Clube[] | null) ?? []).map((club) => [club.id, club]));
    }
  }
  const initial = profile.apelido.slice(0, 1).toUpperCase();
  return <main className="mx-auto grid min-h-screen max-w-md gap-6 px-5 pb-28 pt-8 text-white">
    <header className="flex items-center justify-between"><div><p className="text-sm text-[#a4b8a4]">Olá, {profile.apelido} 👋</p><h1 className="mt-1 text-3xl font-black tracking-tight">{round ? `Rodada ${String(round.numero).padStart(2, "0")}` : "Início"}</h1></div><Link className="grid size-11 place-items-center rounded-full border border-[#5dca62] bg-[#9aec87] font-black text-[#10240e] outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#09100b]" href="/perfil" aria-label="Abrir perfil">{initial}</Link></header>
    {unavailable ? <section className="rounded-2xl border border-amber-400/40 bg-amber-950/20 p-4" role="alert"><h2 className="font-bold">Não foi possível carregar a rodada</h2><p className="mt-1 text-sm text-[#c7b98f]">Confira sua conexão e tente novamente.</p><Link className="mt-3 inline-flex text-sm font-bold text-[#b9f2a9] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href="/">Tentar novamente</Link></section> : !round ? <section className="rounded-2xl border border-[#293e2e] bg-[#111b14] p-5 text-center"><CalendarClock className="mx-auto size-8 text-[#9aec87]" aria-hidden="true" /><h2 className="mt-3 text-lg font-bold">Nenhuma rodada disponível</h2><p className="mt-1 text-sm leading-6 text-[#9caf9d]">Quando a próxima rodada for publicada, os jogos e a janela do mercado aparecerão aqui.</p></section> : <>
      {(() => { const presentation = roundPresentation(round, now); return <section className="rounded-2xl border border-[#306e37] bg-linear-to-br from-[#142c18] to-[#102015] p-4" aria-label="Status da rodada"><span className="inline-flex rounded-full bg-[#246b36] px-2.5 py-1 text-xs font-black tracking-wide text-[#d7ffd1]">{presentation.label}</span><h2 className="mt-3 font-bold text-[#e2ffdc]">{presentation.title}</h2><p className="mt-1 text-sm leading-6 text-[#9bb39d]">{presentation.description} Horário de São Paulo.</p></section>; })()}
      {roundDataUnavailable ? <section className="rounded-2xl border border-amber-400/40 bg-amber-950/20 p-4" role="alert"><h2 className="font-bold">Alguns dados da rodada estão indisponíveis</h2><p className="mt-1 text-sm text-[#c7b98f]">Tente atualizar a página em instantes.</p></section> : <section className="rounded-2xl border border-[#293e2e] bg-[#111b14] p-4">{(() => { const presentation = teamPresentation(Boolean(team), round, now); return <><div className="flex gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#203124] text-[#b9f2a9]"><ShieldCheck className="size-5" aria-hidden="true" /></div><div><h2 className="font-bold">Meu time</h2><p className="mt-1 text-sm font-semibold text-[#edf5ed]">{presentation.title}</p><p className="mt-1 text-sm leading-5 text-[#9caf9d]">{presentation.description}</p></div></div>{presentation.cta && <Link className="mt-5 flex min-h-11 items-center justify-center gap-1 rounded-xl bg-[#9aec87] px-4 py-2 text-sm font-black text-[#10240e] outline-none transition hover:bg-[#b9f2a9] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#111b14]" href="/escalar">{presentation.cta}<ChevronRight className="size-4" aria-hidden="true" /></Link>}</>; })()}</section>}
      <section aria-labelledby="jogos-da-rodada"><div className="mb-3 flex items-center justify-between"><h2 id="jogos-da-rodada" className="text-lg font-bold">Jogos da rodada</h2><span className="text-xs font-semibold text-[#9bb39d]">{games.length} {games.length === 1 ? "jogo" : "jogos"}</span></div>{roundDataUnavailable ? null : games.length === 0 ? <div className="rounded-2xl border border-[#293e2e] bg-[#111b14] p-4 text-sm leading-6 text-[#9caf9d]">Os jogos desta rodada ainda não foram publicados.</div> : <div className="overflow-hidden rounded-2xl border border-[#293e2e] bg-[#111b14]">{games.map((game) => { const home = clubsById.get(game.clube_casa_id); const away = clubsById.get(game.clube_fora_id); return <article className="flex items-center justify-between gap-3 border-b border-[#293e2e] p-4 last:border-0" key={game.id}><div className="min-w-0"><p className="truncate text-sm font-bold">{home?.nome ?? "Clube não disponível"} <span className="px-1 text-[#829184]">×</span> {away?.nome ?? "Clube não disponível"}</p><p className="mt-1 text-xs text-[#9caf9d]">{home?.sigla ?? "—"} · {away?.sigla ?? "—"}</p></div><time className="shrink-0 text-right text-xs font-semibold text-[#b9f2a9]" dateTime={game.inicio_em}>{gameStatus(game)}</time></article>; })}</div>}</section>
    </>}
    <nav className="fixed inset-x-0 bottom-0 flex justify-center gap-12 border-t border-[#26382a] bg-[#09100b]/95 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur" aria-label="Navegação principal"><Link className="flex flex-col items-center gap-1 text-xs font-bold text-[#9aec87] outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-white" href="/"><Trophy className="size-5" aria-hidden="true" />Início</Link><Link className="flex flex-col items-center gap-1 text-xs font-semibold text-[#9caf9d] outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-white" href="/escalar"><ShieldCheck className="size-5" aria-hidden="true" />Escalar</Link><Link className="flex flex-col items-center gap-1 text-xs font-semibold text-[#9caf9d] outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-white" href="/perfil"><CircleUserRound className="size-5" aria-hidden="true" />Perfil</Link></nav>
  </main>;
}
