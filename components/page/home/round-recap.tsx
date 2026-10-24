import { RoundRecapCard } from "@/components/ui";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bestPlayer, formatRecapPoints, groupPosition, recapPoints, recapShareText, type RecapRankingRow, type RecapStat, type RoundRecap } from "@/lib/round-recap";
import { getAdministratorIds, withoutAdministrators } from "@/lib/league-members";
import { ShareRecapButton } from "./share-recap-button";

type Membership = { entrou_em: string; ligas: { id: string; nome: string; arquivada_em: string | null } | { id: string; nome: string; arquivada_em: string | null }[] | null };

/** Resumo de fim de rodada com cartão compartilhável (Tela 10 · Fim de Rodada). */
export default async function RoundRecapSection({ userId, roundId, roundNumber, stats }: { userId: string; roundId: number; roundNumber: number; stats: RecapStat[] }) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const playerIds = stats.map((stat) => stat.jogador_id);

  const [{ data: players }, { data: rankingData }, { data: membershipsData }] = await Promise.all([
    playerIds.length ? supabase.from("jogadores").select("id, nome, nome_exibicao").in("id", playerIds) : Promise.resolve({ data: [] }),
    supabase.from("ranking_rodada").select("usuario_id, posicao").eq("rodada_id", roundId),
    admin.from("ligas_membros").select("entrou_em, ligas(id, nome, arquivada_em)").eq("usuario_id", userId).order("entrou_em"),
  ]);

  const league = ((membershipsData ?? []) as unknown as Membership[])
    .map((membership) => Array.isArray(membership.ligas) ? membership.ligas[0] : membership.ligas)
    .find((candidate) => candidate && !candidate.arquivada_em) ?? null;
  const { data: membersData } = league
    ? await admin.from("ligas_membros").select("usuario_id").eq("liga_id", league.id)
    : { data: [] };
  const allRanking = (rankingData ?? []) as RecapRankingRow[];
  const administratorIds = await getAdministratorIds(admin, [...new Set([...(membersData ?? []).map((member) => member.usuario_id as string), ...allRanking.map((row) => row.usuario_id)])]);
  const memberIds = withoutAdministrators((membersData ?? []) as { usuario_id: string }[], administratorIds).map((member) => member.usuario_id);
  const ranking = withoutAdministrators(allRanking, administratorIds);
  const namesById = new Map((players ?? []).map((player) => [player.id as number, (player.nome_exibicao || player.nome) as string]));

  const recap: RoundRecap = {
    roundNumber,
    points: recapPoints(stats),
    overallPosition: groupPosition(ranking, ranking.map((row) => row.usuario_id), userId),
    overallTotal: ranking.length,
    groupName: league?.nome ?? null,
    groupPosition: groupPosition(ranking, memberIds, userId),
    groupSize: memberIds.length,
    bestPlayer: bestPlayer(stats, namesById),
  };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? null;

  return <section aria-label="Resumo da rodada" className="grid gap-3">
    <RoundRecapCard
      round={`Rodada ${String(roundNumber).padStart(2, "0")}`}
      points={formatRecapPoints(recap.points)}
      overallPosition={recap.overallPosition ? `${recap.overallPosition}º de ${recap.overallTotal}` : "—"}
      leaguePosition={recap.groupPosition ? `${recap.groupPosition}º de ${recap.groupSize}` : "—"}
      highlight={recap.bestPlayer ? { name: recap.bestPlayer.name, points: formatRecapPoints(recap.bestPlayer.points) } : { name: "—", points: "0,0" }}
    />
    <ShareRecapButton text={recapShareText(recap)} url={siteUrl} />
  </section>;
}
