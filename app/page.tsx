import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ChevronRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LockCountdown } from "./lock-countdown";
import { Badge, ScoreCard } from "@/components/ui";

type StatusRodada = "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA";
type StatusJogo = "A_JOGAR" | "EM_ANDAMENTO" | "ENCERRADO" | "ADIADO" | "CANCELADO";
type Rodada = { id: number; numero: number; status: StatusRodada; abre_em: string | null; trava_em: string; fechada_em: string | null; rotulo_api: string };
type Jogo = { id: number; clube_casa_id: number; clube_fora_id: number; inicio_em: string; status: StatusJogo; gols_casa: number | null; gols_fora: number | null; pontuado_em: string | null };
type Clube = { id: number; nome: string; sigla: string; logo_url: string | null };

const saoPaulo = "America/Sao_Paulo";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: saoPaulo, weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function teamPresentation(hasTeam: boolean, round: Rodada, now: Date) {
  const canEdit = round.status === "ABERTA" && now < new Date(round.trava_em);
  if (!hasTeam && canEdit) return { title: "Você ainda não escalou", description: "Monte sua equipe para disputar esta rodada.", cta: "Montar meu time" };
  if (hasTeam && canEdit) return { title: "Seu time está escalado", description: `Você pode editar até ${formatDateTime(round.trava_em)}.`, cta: "Editar meu time" };
  if (hasTeam && round.status === "EM_ANDAMENTO") return { title: "Seu time está acompanhando a rodada", description: "Os pontos são lançados quando cada jogo termina.", cta: "Ver meu time" };
  if (hasTeam) return { title: "Seu time está travado", description: "A escalação não pode mais ser alterada nesta rodada.", cta: "Ver meu time" };
  return { title: "Nenhum time escalado nesta rodada", description: "Acompanhe a próxima rodada para montar sua equipe.", cta: null };
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
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em, rotulo_api").in("status", ["ABERTA", "EM_ANDAMENTO"]).order("numero", { ascending: false }).limit(1),
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em, rotulo_api").eq("status", "AGENDADA").order("numero", { ascending: true }).limit(1),
    supabase.from("rodadas").select("id, numero, status, abre_em, trava_em, fechada_em, rotulo_api").eq("status", "FECHADA").order("numero", { ascending: false }).limit(1),
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
      const { data: clubs, error: clubsError } = await supabase.from("clubes").select("id, nome, sigla, logo_url").in("id", clubIds);
      roundDataUnavailable ||= Boolean(clubsError);
      clubsById = new Map(((clubs as Clube[] | null) ?? []).map((club) => [club.id, club]));
    }
  }

  return <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-5 pt-8 pb-44 text-white">
    <header className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Olá, {profile.apelido} 👋</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">{round ? `Rodada ${String(round.numero).padStart(2, "0")}` : "Início"} · Brasileirão 2026</h1>
      </div>
    </header>
    {unavailable ? <section className="rounded-2xl border border-amber-400/40 bg-amber-950/20 p-4" role="alert"><h2 className="font-bold">Não foi possível carregar a rodada</h2><p className="mt-1 text-sm text-[#c7b98f]">Confira sua conexão e tente novamente.</p><Link className="mt-3 inline-flex text-sm font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4" href="/">Tentar novamente</Link></section> : !round ? <section className="rounded-2xl border border-border bg-card p-5 text-center"><CalendarClock className="mx-auto size-8 text-[#9aec87]" aria-hidden="true" /><h2 className="mt-3 text-lg font-bold">Nenhuma rodada disponível</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Quando a próxima rodada for publicada, os jogos e a janela do mercado aparecerão aqui.</p></section> : <>
      <div className="flex items-center gap-2">
        <Badge className="h-6 !px-4" tone={round.status === "ABERTA" ? "primary" : round.status === "AGENDADA" ? "secondary" : "neutral"}>{round.status.toLocaleLowerCase()}</Badge>
        <p className="text-[12px]/[normal] box-border text-[#6d7d76] opacity-80 font-bold text-left [white-space:nowrap]">{round.status === "ABERTA" ? `mercado aberto` : round.status === "AGENDADA" ? `sem parcial ao vivo` : "pontuaçao oficial"}</p>
      </div>

      {round.status === "ABERTA" && now < new Date(round.trava_em) && <LockCountdown travaEm={round.trava_em} formattedDate={formatDateTime(round.trava_em)} />}

      {roundDataUnavailable ? <section className="rounded-2xl border border-amber-400/40 bg-amber-950/20 p-4" role="alert"><h2 className="font-bold">Alguns dados da rodada estão indisponíveis</h2><p className="mt-1 text-sm text-[#c7b98f]">Tente atualizar a página em instantes.</p></section> : (() => {
        const presentation = teamPresentation(Boolean(team), round, now);
        const isUnselected = !team && round.status === "ABERTA" && now < new Date(round.trava_em);
        return <section className={isUnselected ? "rounded-2xl bg-primary/12 p-4 outline outline-1.5 -outline-offset-1 outline-primary" : "rounded-2xl border border-border bg-card p-4"}>
          <div className="flex items-center gap-3">
            <div className={isUnselected ? "grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground" : "grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary"}><ShieldCheck className="size-[22px]" aria-hidden="true" /></div>
            <div className="min-w-0">
              <h2 className="text-[17px] font-extrabold text-foreground">{presentation.title}</h2>
              <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">{isUnselected ? "Monte 11 jogadores com C$ 100. Leva uns 3 minutos — ou use a escalação automática." : presentation.description}</p>
            </div>
          </div>
        </section>
      })()}
      <section aria-labelledby="jogos-da-rodada">
        <div className="mb-3 flex items-center justify-between"><h2 id="jogos-da-rodada" className="text-lg font-bold">Jogos da rodada</h2><span className="text-xs font-semibold text-muted-foreground">{games.length} {games.length === 1 ? "jogo" : "jogos"}</span></div>
        {roundDataUnavailable ? null : games.length === 0 ? <div className="rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">Os jogos desta rodada ainda não foram publicados.</div> : <div className="grid gap-2">{games.map((game) => {
          const home = clubsById.get(game.clube_casa_id);
          const away = clubsById.get(game.clube_fora_id);
          return <ScoreCard key={game.id} home={{ nome: home?.nome ?? "Clube não disponível", sigla: home?.sigla ?? "—", logoUrl: home?.logo_url }} away={{ nome: away?.nome ?? "Clube não disponível", sigla: away?.sigla ?? "—", logoUrl: away?.logo_url }} homeGoals={game.gols_casa} awayGoals={game.gols_fora} kickoff={game.inicio_em} status={game.status} />;
        })}</div>}
      </section>
    </>}
  </main>
}
