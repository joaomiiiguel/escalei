import { redirect } from "next/navigation";
import { LineupBuilder } from "@/components/ui/lineup-builder";
import type { LineupPlayer } from "@/components/ui/lineup-formation";
import { Logo } from "@/components/ui/logo";
import { RoundLineup, SavedLineup } from "@/components/ui/saved-lineup";
import { LineupTitle } from "./lineup-title";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getLeagueMembershipStatus } from "@/lib/league-access";
import { isRoundEditable, playerRoundStatus } from "@/lib/lineup-rules";
import { parseAvailability } from "@/lib/player-availability";
import { getCurrentRound } from "@/lib/current-round";
import { getLateLineupState } from "@/lib/late-lineup";
import { displayedKickoff } from "@/lib/game-kickoff";
import { toPassStatus, type PassStatus } from "@/lib/round-pass";
import { Clock3 } from "lucide-react";
import { Suspense } from "react";

import type { SavedPlayer, SavedTeam, ActiveRound, RoundGame, PlayerStat } from "@/lib/types";
import Link from "next/link";
import { pitchPanel, quietPanel, scoreboard } from "@/components/ui/scoreboard";
import DemoLineupPicker from "@/components/page/home/demo-lineup-picker";

/** Apelidos que têm acesso ao modo de demonstração. */
const DEMO_USERS = new Set(["Miguel"]);

function LineupSkeleton() {
  return (
    <main className={shell}>
      <div className="animate-pulse space-y-4" aria-label="Carregando escalação" aria-busy="true">
        <div className="h-9 w-40 rounded bg-muted" />
        <div className="h-[65vh] rounded-[20px] bg-gramado-escuro" />
        <div className="h-32 rounded-[20px] bg-muted/60" />
      </div>
    </main>
  );
}

function matchTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}

const shell = "mx-auto flex min-h-screen w-full max-w-lg flex-col gap-4 px-4 pt-4 font-(family-name:--font-body) text-giz antialiased";

function Message({ children }: { children: React.ReactNode }) {
  return <p className={`${quietPanel} p-4 text-[15px] text-giz/75`}>{children}</p>;
}

function Header() {
  return <header className="pr-12">
    <Logo size="sm" href="/inicio" priority alt="Escalou, início" />
  </header>;
}

/** Painel de gramado para quando não há time para mostrar. */
function EmptyLineup({ title, description }: { title: string; description: string }) {
  return <section className={`${pitchPanel} p-5`}>
    <h2 className={`${scoreboard} text-[28px] uppercase leading-[0.9]`}>{title}</h2>
    <p className="mt-2 text-[15px] leading-snug text-giz/75">{description}</p>
    <Link href="/inicio" className="mt-4 inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-giz">Voltar para o início</Link>
  </section>;
}

type LineupBodyProps = {
  round: ActiveRound | null;
  savedTeam: SavedTeam | null;
  canEdit: boolean;
  editMode: boolean;
  balance: number;
  initialPlayers: LineupPlayer[];
  roundPlayers: LineupPlayer[];
  lastUpdated: string | null;
  passStatus: PassStatus | null;
  lateLineup: boolean;
};

function LineupBody({ 
  round,
  savedTeam,
  canEdit,
  editMode,
  balance,
  initialPlayers,
  roundPlayers,
  lastUpdated,
  passStatus,
  lateLineup
}: LineupBodyProps) {
  if (!round) {
    return <Message>Não há rodada disponível no momento.</Message>;
  }

  const isEditing = canEdit && (!savedTeam || editMode);

  if (isEditing) {
    return (
      <>
        {lateLineup && (
          <p className="flex items-start gap-3 rounded-[14px] border border-warning/40 bg-warning/10 p-3.5 text-[15px] leading-snug">
            <Clock3 className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
            A rodada já travou, mas ainda dá tempo: escale só com jogadores de times que não entraram em campo. Depois de salvar, o time não pode ser alterado.
          </p>
        )}
        <LineupBuilder
          budget={balance}
          initialFormation={savedTeam?.formacao}
          initialPlayers={initialPlayers}
          passStatus={passStatus}
          roundId={round.id}
        />
      </>
    );
  }

  if (!savedTeam) {
    return <Message>Você não escalou jogadores para esta rodada.</Message>;
  }

  if (round.status === "ABERTA") {
    return (
      <SavedLineup
        budget={balance}
        formation={savedTeam.formacao}
        passStatus={passStatus}
        players={initialPlayers}
        travaEm={round.trava_em}
      />
    );
  }

  return (
    <RoundLineup
      formation={savedTeam.formacao}
      players={roundPlayers}
      roundNumber={round.numero}
      status={round.status}
      finishedAt={round.fechada_em}
      lastUpdated={lastUpdated}
    />
  );
}

async function LineupContent({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  // Pertencimento, perfil, carteira, passes e rodada atual não dependem entre si.
  const [leagueMembershipStatus, { data: profile }, { data: wallet }, { data: availablePasses }, { data: round }] = await Promise.all([
    getLeagueMembershipStatus(user.id),
    supabase.from("perfis").select("id, apelido").eq("id", user.id).maybeSingle(),
    supabase.from("carteiras").select("saldo").eq("usuario_id", user.id).maybeSingle(),
    supabase.rpc("fn_passes_disponiveis"),
    getCurrentRound<ActiveRound>(supabase, "id, numero, status, trava_em, fechada_em, simulada"),
  ]);
  if (leagueMembershipStatus !== "ATIVA") redirect(`/entrar?erro=${leagueMembershipStatus === "INATIVA" ? "grupo_inativado" : "sem_liga"}`);
  if (!profile) redirect("/onboarding");

  const balance = Number(wallet?.saldo ?? 60);
  const { data: savedTeamData } = round
    ? await supabase.from("times").select("formacao, times_jogadores(jogadores(id, clube_id, nome, nome_exibicao, posicao, preco, status, status_motivo, clubes(nome, sigla, logo_url)))").eq("usuario_id", user.id).eq("rodada_id", round.id).maybeSingle()
    : { data: null };
  const savedTeam = savedTeamData as unknown as SavedTeam | null;
  const savedPlayers = (savedTeam?.times_jogadores ?? []).flatMap(({ jogadores }) => jogadores ? [jogadores] : []);
  const initialPlayers: LineupPlayer[] = savedPlayers.map((player) => {
    const club = Array.isArray(player.clubes) ? player.clubes[0] : player.clubes;
    return { id: player.id, name: player.nome_exibicao || player.nome, position: player.posicao, price: Number(player.preco), club: club?.sigla ?? "—", clubName: club?.nome ?? "Clube não disponível", logoUrl: club?.logo_url ?? null, status: parseAvailability(player.status), statusReason: player.status_motivo ?? null };
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
    const roundStatus = playerRoundStatus(statGame?.status ?? game?.status);
    return {
      ...player,
      roundPoints: Number(stat?.pontos ?? 0),
      roundStatus,
      roundLabel: game ? matchTime(displayedKickoff(game)) : "sem jogo",
    };
  });

   // ─── Modo demonstração (só para apelidos em DEMO_USERS) ───────────────────
    if (DEMO_USERS.has(String(profile?.apelido))) {
      return (
        <main className={`${shell} pb-44`}>
          <Header />
          <DemoLineupPicker />
        </main>
      );
    }

  if (!round) {
    return (
      <main className={shell}>
        <Header />
        <LineupTitle passes={availablePasses} title="Meu time" />
        <EmptyLineup title="Sem rodada no momento" description="Quando a próxima rodada for publicada, você monta seu time aqui." />
      </main>
    );
  }

  // Depois da trava, quem não salvou pode escalar enquanto menos da metade dos jogos começou.
  const lateLineup = !savedTeam && (await getLateLineupState(supabase, round)).open;
  const canEdit = isRoundEditable(round) || lateLineup;
  const { data: passRequired } = canEdit
    ? await supabase.rpc("fn_passe_exigido", { p_rodada_id: round.id })
    : { data: null };
  const passStatus = toPassStatus(availablePasses, passRequired);

  if (!canEdit && !savedTeam) {
    return (
      <main className={shell}>
        <Header />
        <LineupTitle passes={availablePasses} title="Meu time" />
        <EmptyLineup title="Você não escalou nesta rodada" description="A escalação desta rodada já travou. Fique de olho na próxima para montar seu time." />
      </main>
    );
  }

  return (
    <main className={shell}>
      <Header />
      <LineupTitle passExempt={passRequired === false} passes={availablePasses} title={round && canEdit ? "Montar time" : "Meu time"} />
      <LineupBody
        round={round}
        savedTeam={savedTeam}
        canEdit={canEdit}
        editMode={editar === "1"}
        balance={balance}
        initialPlayers={initialPlayers}
        roundPlayers={roundPlayers}
        lastUpdated={lastUpdatedIso}
        passStatus={passStatus}
        lateLineup={lateLineup}
      />
    </main>)
}

export default async function Lineup({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  return (
    <Suspense fallback={<LineupSkeleton />}>
      <LineupContent searchParams={searchParams} />
    </Suspense>
  );
}
