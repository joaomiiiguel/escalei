/**
 * Conversão das respostas da API-Football (`/teams` e `/players`) para o
 * catálogo do jogo: clubes, jogadores, posição e preço inicial.
 *
 * Preço inicial (Regras do Jogo): `clamp(3 + média de pontos na temporada, 2, 20)`;
 * jogador sem jogos na temporada começa em C$ 5. A média é estimada com a
 * tabela de pontuação vigente aplicada aos totais da temporada informados por
 * `/players` (a API não informa clean sheet nem impedimentos por jogador nesse
 * endpoint, então esses scouts ficam fora da estimativa; a variação de preço
 * por rodada corrige depois).
 *
 * Este módulo não usa globais do Deno para poder ser testado com Vitest.
 */

export type Position = "GOL" | "DEF" | "MEI" | "ATA";

export type ApiTeam = { team: { id: number; name: string; code?: string | null; logo?: string | null } };

export type ApiSeasonStatistic = {
  team?: { id?: number | null };
  league?: { id?: number | null; season?: number | null };
  games?: { appearences?: number | null; minutes?: number | null; position?: string | null };
  shots?: { total?: number | null; on?: number | null };
  goals?: { total?: number | null; conceded?: number | null; assists?: number | null; saves?: number | null };
  tackles?: { total?: number | null };
  fouls?: { drawn?: number | null; committed?: number | null };
  cards?: { yellow?: number | null; yellowred?: number | null; red?: number | null };
  penalty?: { won?: number | null; commited?: number | null; missed?: number | null; saved?: number | null };
};

export type ApiPlayer = { player: { id: number; name?: string | null; number?: number | null }; statistics?: ApiSeasonStatistic[] };

export type ScoringWeights = Map<string, number>;

export type SavedClub = { id: number; sigla: string; api_football_id: number | null };
export type SavedPlayer = { id: number; api_football_id: number | null };

const n = (value: number | null | undefined) => (Number.isFinite(value) ? Number(value) : 0);
const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export const CLUB_ID_OFFSET = 1_100_000_000;
export const PLAYER_ID_OFFSET = 1_200_000_000;
export const DEFAULT_PRICE = 5;

/** Siglas oficiais quando a API não informa ou informa uma sigla ambígua. */
const CLUB_CODES: Record<string, string> = {
  "Atletico-MG": "CAM",
  "Atletico Paranaense": "CAP",
  "Atletico Goianiense": "ACG",
  "Gremio": "GRE",
  "Grêmio": "GRE",
  "Sao Paulo": "SAO",
  "São Paulo": "SAO",
  "Coritiba": "CTB",
  "Internacional": "INT",
  "Chapecoense-sc": "CHA",
  "Vasco DA Gama": "VAS",
  "RB Bragantino": "RBB",
};

export function positionFromApi(value: string | null | undefined): Position | null {
  return ({ Goalkeeper: "GOL", Defender: "DEF", Midfielder: "MEI", Attacker: "ATA", G: "GOL", D: "DEF", M: "MEI", F: "ATA" } as Record<string, Position>)[value ?? ""] ?? null;
}

function baseCode(team: ApiTeam["team"]): string {
  const known = CLUB_CODES[team.name.trim()];
  if (known) return known;
  const code = team.code?.trim().toUpperCase();
  if (code && /^[A-Z0-9]{3}$/.test(code)) return code;
  return team.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase().padEnd(3, "X");
}

/**
 * Clubes da temporada prontos para upsert. Preserva o id de quem já existe
 * (pelo id da API). Se a sigla oficial estiver com um clube fora da temporada
 * (por exemplo, um cadastro antigo sem id da API), esse clube recebe uma sigla
 * provisória em `renames` e a oficial fica com o clube da temporada.
 */
export function buildClubs(teams: ApiTeam[], saved: SavedClub[], now: string) {
  const byApiId = new Map(saved.flatMap((club) => (club.api_football_id ? [[club.api_football_id, club] as const] : [])));
  const seasonIds = new Set(teams.map(({ team }) => byApiId.get(team.id)?.id ?? CLUB_ID_OFFSET + team.id));
  const savedByCode = new Map(saved.map((club) => [club.sigla, club]));
  const usedCodes = new Set(saved.map((club) => club.sigla));
  const renames: Array<{ id: number; sigla: string }> = [];
  const placeholder = () => {
    for (let index = 1; ; index += 1) {
      const code = `X${String(index).padStart(2, "0")}`;
      if (!usedCodes.has(code)) return code;
    }
  };
  const clubs = teams.map(({ team }) => {
    if (!Number.isInteger(team.id) || !team.name?.trim()) throw new Error(`Clube inválido retornado pela API-Football: ${team.name ?? team.id}.`);
    const id = byApiId.get(team.id)?.id ?? CLUB_ID_OFFSET + team.id;
    let sigla = baseCode(team);
    const holder = savedByCode.get(sigla);
    if (holder && holder.id !== id && !seasonIds.has(holder.id)) {
      const code = placeholder();
      usedCodes.add(code);
      renames.push({ id: holder.id, sigla: code });
      savedByCode.delete(sigla);
    }
    for (let suffix = 1; savedByCode.has(sigla) && savedByCode.get(sigla)!.id !== id; suffix += 1) sigla = `${sigla.slice(0, 2)}${suffix}`;
    savedByCode.set(sigla, { id, sigla, api_football_id: team.id });
    usedCodes.add(sigla);
    return { id, api_football_id: team.id, nome: team.name.trim(), sigla, logo_url: team.logo ?? null, ativo: true, api_atualizado_em: now };
  });
  return { clubs, renames };
}

/** Estatística da Série A com mais jogos (jogador transferido dentro da liga aparece mais de uma vez). */
export function leagueStatistic(entry: ApiPlayer, leagueId: number): ApiSeasonStatistic | null {
  const inLeague = (entry.statistics ?? []).filter((statistic) => statistic.league?.id === leagueId && statistic.team?.id);
  return inLeague.sort((first, second) => n(second.games?.appearences) - n(first.games?.appearences))[0] ?? null;
}

/** Totais da temporada por scout, no mesmo formato de `tabela_pontuacao.scout`. */
export function seasonScoutTotals(statistic: ApiSeasonStatistic): Record<string, number> {
  const goals = n(statistic.goals?.total);
  const shotsOn = n(statistic.shots?.on);
  return {
    gols: goals,
    assistencias: n(statistic.goals?.assists),
    finalizacoes_no_gol: Math.max(shotsOn - goals, 0),
    finalizacoes_fora: Math.max(n(statistic.shots?.total) - shotsOn, 0),
    desarmes: n(statistic.tackles?.total),
    faltas_sofridas: n(statistic.fouls?.drawn),
    penaltis_sofridos: n(statistic.penalty?.won),
    defesas: n(statistic.goals?.saves),
    penaltis_defendidos: n(statistic.penalty?.saved),
    gols_sofridos: n(statistic.goals?.conceded),
    faltas_cometidas: n(statistic.fouls?.committed),
    amarelos: n(statistic.cards?.yellow),
    vermelhos: n(statistic.cards?.red) + n(statistic.cards?.yellowred),
    penaltis_perdidos: n(statistic.penalty?.missed),
    penaltis_cometidos: n(statistic.penalty?.commited),
  };
}

/** Média estimada de pontos por jogo na temporada, ou `null` sem jogos. */
export function seasonAverage(statistic: ApiSeasonStatistic, position: Position, weights: ScoringWeights): number | null {
  const appearances = n(statistic.games?.appearences);
  if (appearances <= 0) return null;
  const total = Object.entries(seasonScoutTotals(statistic))
    .reduce((sum, [scout, value]) => sum + value * (weights.get(`${scout}:${position}`) ?? 0), 0);
  return round(total / appearances, 2);
}

export function initialPrice(average: number | null): number {
  if (average === null) return DEFAULT_PRICE;
  return Math.min(20, Math.max(2, round(3 + average, 1)));
}

/** Jogadores da temporada prontos para upsert, já com clube, posição e preço. */
export function buildPlayers(
  entries: ApiPlayer[],
  options: { leagueId: number; clubIdByApiId: Map<number, number>; saved: SavedPlayer[]; weights: ScoringWeights; now: string },
) {
  const byApiId = new Map(options.saved.flatMap((player) => (player.api_football_id ? [[player.api_football_id, player.id] as const] : [])));
  const players = new Map<number, ReturnType<typeof toPlayer>>();
  function toPlayer(entry: ApiPlayer, statistic: ApiSeasonStatistic, clubId: number, position: Position) {
    const average = seasonAverage(statistic, position, options.weights);
    const price = initialPrice(average);
    const name = entry.player.name!.trim();
    return {
      id: byApiId.get(entry.player.id) ?? PLAYER_ID_OFFSET + entry.player.id,
      api_football_id: entry.player.id,
      clube_id: clubId,
      nome: name,
      nome_exibicao: name.slice(0, 16),
      numero: Number.isInteger(entry.player.number) ? entry.player.number : null,
      posicao: position,
      preco: price,
      preco_inicial: price,
      // O banco exige médias não negativas; o preço usa a média real (com piso de C$ 2).
      media_temporada: Math.max(average ?? 0, 0),
      media_ult5: Math.max(average ?? 0, 0),
      jogos_temporada: n(statistic.games?.appearences),
      ativo: true,
      api_atualizado_em: options.now,
    };
  }
  for (const entry of entries) {
    if (!entry.player?.id || !entry.player.name?.trim()) continue;
    const statistic = leagueStatistic(entry, options.leagueId);
    const clubId = statistic?.team?.id ? options.clubIdByApiId.get(statistic.team.id) : undefined;
    const position = positionFromApi(statistic?.games?.position);
    if (!statistic || !clubId || !position) continue;
    players.set(entry.player.id, toPlayer(entry, statistic, clubId, position));
  }
  return [...players.values()];
}

/** Pesos da tabela de pontuação indexados por `scout:posicao`. */
export function scoringWeights(rows: Array<{ scout: string; posicao: string; pontos: number | string }>): ScoringWeights {
  return new Map(rows.map((row) => [`${row.scout}:${row.posicao}`, Number(row.pontos)]));
}
