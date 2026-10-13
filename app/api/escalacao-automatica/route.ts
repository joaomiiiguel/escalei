import { NextResponse } from "next/server";
import { getCurrentRound } from "@/lib/current-round";
import { createClient } from "@/lib/supabase/server";

const formations = {
  "4-3-3": { GOL: 1, DEF: 4, MEI: 3, ATA: 3 },
  "4-4-2": { GOL: 1, DEF: 4, MEI: 4, ATA: 2 },
  "3-5-2": { GOL: 1, DEF: 3, MEI: 5, ATA: 2 },
} as const;

type Formation = keyof typeof formations;
type Position = keyof (typeof formations)[Formation];
type Candidate = {
  id: number;
  name: string;
  position: Position;
  price: number;
  club: string;
  clubName: string;
  logoUrl: string | null;
  score: number;
};

function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

export async function GET(request: Request) {
  const formation = new URL(request.url).searchParams.get("formacao");
  if (!formation || !(formation in formations)) return NextResponse.json({ error: "Formação inválida." }, { status: 400 });

  const db = await createClient();
  const { data: round, error: roundError } = await getCurrentRound<{
    id: number; numero: number; status: "AGENDADA" | "ABERTA" | "EM_ANDAMENTO" | "FECHADA"; trava_em: string;
  }>(db, "id, numero, status, trava_em");
  if (roundError || !round) return NextResponse.json({ error: "Rodada indisponível." }, { status: 404 });
  if (round.status !== "ABERTA" || new Date() >= new Date(round.trava_em)) {
    return NextResponse.json({ error: "A escalação automática está disponível somente enquanto o mercado estiver aberto." }, { status: 409 });
  }

  const { data: games, error: gamesError } = await db.from("jogos")
    .select("clube_casa_id, clube_fora_id")
    .eq("rodada_id", round.id);
  if (gamesError || !games?.length) return NextResponse.json({ error: "Jogos da rodada indisponíveis." }, { status: 404 });

  const homeClubIds = new Set(games.map((game) => game.clube_casa_id));
  const clubIds = [...new Set(games.flatMap((game) => [game.clube_casa_id, game.clube_fora_id]))];
  const opponentByClubId = new Map<number, number>();
  for (const game of games) {
    opponentByClubId.set(game.clube_casa_id, game.clube_fora_id);
    opponentByClubId.set(game.clube_fora_id, game.clube_casa_id);
  }
  const { data: players, error: playersError } = await db.from("jogadores")
    .select("id, clube_id, nome, nome_exibicao, posicao, preco, media_temporada, media_ult5, jogos_temporada, clubes(nome, sigla, logo_url)")
    .eq("ativo", true)
    .in("clube_id", clubIds);
  if (playersError) return NextResponse.json({ error: "Mercado indisponível." }, { status: 500 });

  const playersByClubId = new Map<number, typeof players>();
  for (const player of players ?? []) {
    const clubPlayers = playersByClubId.get(player.clube_id) ?? [];
    clubPlayers.push(player);
    playersByClubId.set(player.clube_id, clubPlayers);
  }
  const recentAverageByClubId = new Map(
    [...playersByClubId.entries()].map(([clubId, clubPlayers]) => [
      clubId,
      clubPlayers.reduce((total, player) => total + asNumber(player.media_ult5), 0) / Math.max(clubPlayers.length, 1),
    ]),
  );
  const hasPerformanceData = (players ?? []).some((player) =>
    asNumber(player.media_ult5) > 0 || asNumber(player.media_temporada) > 0 || asNumber(player.jogos_temporada) > 0,
  );

  const candidates = (players ?? []).map((player) => {
    const club = Array.isArray(player.clubes) ? player.clubes[0] : player.clubes;
    const recentAverage = asNumber(player.media_ult5);
    const seasonAverage = asNumber(player.media_temporada);
    const matches = asNumber(player.jogos_temporada);
    const opponentForm = recentAverageByClubId.get(opponentByClubId.get(player.clube_id) ?? -1) ?? 0;
    const score = recentAverage * 0.65 + seasonAverage * 0.3 + Math.min(matches, 20) * 0.02
      + (homeClubIds.has(player.clube_id) ? 0.2 : 0) - opponentForm * 0.1;
    return {
      id: player.id,
      name: player.nome_exibicao || player.nome,
      position: player.posicao as Position,
      price: asNumber(player.preco),
      club: club?.sigla ?? "—",
      clubName: club?.nome ?? "Clube não disponível",
      logoUrl: club?.logo_url ?? null,
      score,
    } satisfies Candidate;
  });

  const required = formations[formation as Formation];
  const byPosition = (Object.keys(required) as Position[]).reduce<Record<Position, Candidate[]>>((groups, position) => {
    groups[position] = candidates.filter((candidate) => candidate.position === position)
      .sort((first, second) => first.price - second.price || second.score - first.score || first.name.localeCompare(second.name));
    return groups;
  }, {} as Record<Position, Candidate[]>);
  if ((Object.keys(required) as Position[]).some((position) => byPosition[position].length < required[position])) {
    return NextResponse.json({ error: "Não há jogadores suficientes em todas as posições para esta rodada." }, { status: 422 });
  }

  const selected = (Object.keys(required) as Position[]).flatMap((position) => byPosition[position].slice(0, required[position]));
  let cost = selected.reduce((total, player) => total + player.price, 0);
  if (cost > 100) return NextResponse.json({ error: "Não há escalação válida dentro do orçamento." }, { status: 422 });

  for (;;) {
    let bestUpgrade: { position: Position; current: Candidate; next: Candidate; gain: number; cost: number } | null = null;
    for (const position of Object.keys(required) as Position[]) {
      const currentPlayers = selected.filter((player) => player.position === position);
      for (const current of currentPlayers) for (const next of byPosition[position]) {
        const extraCost = next.price - current.price;
        const gain = next.score - current.score;
        if (gain <= 0 || cost + extraCost > 100 || selected.some((player) => player.id === next.id)) continue;
        const value = extraCost <= 0 ? gain + 100 : gain / extraCost;
        const bestValue = bestUpgrade ? (bestUpgrade.cost <= 0 ? bestUpgrade.gain + 100 : bestUpgrade.gain / bestUpgrade.cost) : -Infinity;
        if (value > bestValue) bestUpgrade = { position, current, next, gain, cost: extraCost };
      }
    }
    if (!bestUpgrade) break;
    const index = selected.findIndex((player) => player.id === bestUpgrade.current.id);
    selected[index] = bestUpgrade.next;
    cost += bestUpgrade.cost;
  }

  return NextResponse.json({
    players: selected.map(({ score: _score, ...player }) => player),
    cost,
    hasPerformanceData,
    criteria: ["média dos últimos 5 jogos", "média da temporada", "jogos disputados", "mando de campo", "forma recente do adversário", "orçamento"],
  });
}
