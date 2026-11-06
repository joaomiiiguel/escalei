import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bestPlayer, formatRecapPoints, groupPosition, recapPoints, recapShareText, type RecapRankingRow, type RecapStat, type RoundRecap } from "@/lib/round-recap";
import { getAdministratorIds, withoutAdministrators } from "@/lib/league-members";
import { ShareRecapButton } from "./share-recap-button";
import { quietPanel, scoreboard } from "@/components/ui/scoreboard";

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

  return <RoundRecapView recap={recap} siteUrl={siteUrl} />;
}

/** Posições e craque do usuário na rodada fechada, com o botão de compartilhar. */
export function RoundRecapView({ recap, siteUrl }: { recap: RoundRecap; siteUrl: string | null }) {
  const rows = [
    { label: recap.groupName ? `Na liga ${recap.groupName}` : "Na sua liga", position: recap.groupPosition, total: recap.groupSize },
    { label: "No ranking geral", position: recap.overallPosition, total: recap.overallTotal },
  ];

  return <section aria-labelledby="resumo-titulo" className={`${quietPanel} p-4`}>
    <h2 id="resumo-titulo" className={`${scoreboard} text-[26px] uppercase leading-none`}>Como você foi</h2>
    <dl className="mt-2 divide-y divide-border/70">
      {rows.map((row) => <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
        <dt className="min-w-0 truncate text-[15px] text-giz/75">{row.label}</dt>
        <dd className="shrink-0 text-sm text-giz/60">
          {row.position ? <><b className={`${scoreboard} text-[30px] leading-none text-giz`}>{row.position}º</b> de {row.total}</> : "Sem posição"}
        </dd>
      </div>)}
      <div className="flex items-baseline justify-between gap-4 py-3">
        <dt className="text-[15px] text-giz/75">Craque do seu time</dt>
        <dd className="min-w-0 truncate text-right text-[15px] font-bold">
          {recap.bestPlayer ? <>{recap.bestPlayer.name} <span className="font-normal text-primary">{formatRecapPoints(recap.bestPlayer.points)} pts</span></> : "Ninguém pontuou"}
        </dd>
      </div>
    </dl>
    <div className="mt-2">
      <ShareRecapButton text={recapShareText(recap)} url={siteUrl} />
    </div>
  </section>;
}
