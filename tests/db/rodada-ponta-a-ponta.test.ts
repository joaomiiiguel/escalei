// @vitest-environment node
/**
 * Teste ponta a ponta de uma rodada passada (JOA-51): a rodada 32 do
 * Brasileirão 2026 percorre abertura, escalação, trava, jogos ao vivo,
 * pontuação, conferência, preços, saldos, fechamento e rankings, e a rodada
 * 33 abre em seguida.
 *
 * Dados: catálogo e calendário reais (`fixtures/api-football/2026`) e scouts
 * reais da rodada 32 (`2026/rodada-32`, gravados com `npm run record:round`).
 * O calendário é deslocado para o futuro para que a trava do banco (`now()`)
 * valha durante o teste; o relógio do orquestrador avança por passos.
 *
 * As decisões são as do orquestrador de produção (`_shared/round-flow.ts`);
 * `tick` e `scoreMatch` reproduzem só o acesso ao banco de `advance-round` e
 * `score-match`, trocando PostgREST e API-Football pelo PGlite e pelas gravações.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { buildCalendar, gameRow, type ApiFixture } from "@/supabase/functions/_shared/calendar";
import { buildClubs, PLAYER_ID_OFFSET, positionFromApi, type ApiTeam } from "@/supabase/functions/_shared/catalog";
import {
  checkAtFor,
  dueRoundTransitions,
  gamesToPoll,
  gamesToScore,
  gameUpdateFromFixture,
  interruptedToSettle,
  isRoundResolved,
  type FlowGame,
} from "@/supabase/functions/_shared/round-flow";
import { chunk, DEFAULT_MAX_SCORING_ATTEMPTS, successfulAttemptUpdate } from "@/supabase/functions/_shared/retry";
import { buildScouts, type ApiEvent, type ApiPlayerGroup, type ApiPlayerStatistic } from "@/supabase/functions/_shared/scouts";
import { createMigratedDatabase } from "./supabase-pglite";
import { seedUser } from "./seed";

const FIXTURES_DIR = path.resolve(__dirname, "../fixtures/api-football/2026");
const readJson = <T>(file: string): T => JSON.parse(readFileSync(path.join(FIXTURES_DIR, file), "utf8")) as T;

const teams = readJson<{ response: ApiTeam[] }>("teams.json").response;
const calendarFixtures = readJson<{ response: ApiFixture[] }>("fixtures.json").response;
const ROUND = 32;
const [round32, round33] = buildCalendar(calendarFixtures, ROUND).filter((round) => round.numero <= ROUND + 1);
const recording = (fixtureId: number) => ({
  players: readJson<{ response: ApiPlayerGroup[] }>(`rodada-${ROUND}/fixture-${fixtureId}-players.json`).response,
  events: readJson<{ response: ApiEvent[] }>(`rodada-${ROUND}/fixture-${fixtureId}-events.json`).response,
});

const ANA = "00000000-0000-4000-8000-0000000000a1";
const BIA = "00000000-0000-4000-8000-0000000000b2";
const CAIO = "00000000-0000-4000-8000-0000000000c3";
const LEAGUE = "00000000-0000-4000-8000-00000000e2e0";
const SEASON = 2026;
const GAME_MINUTES = 115;
const MINUTE = 60_000;

/** Desloca o calendário: o relógio simulado começa 1 min antes da abertura da rodada 32, no "agora" real. */
const shiftMs = Date.now() - (new Date(round32.abre_em).getTime() - MINUTE);
const shifted = (iso: string) => new Date(new Date(iso).getTime() + shiftMs).toISOString();
const atReal = (iso: string, plusMinutes = 0) => new Date(new Date(iso).getTime() + plusMinutes * MINUTE);
const simulated = (realDate: Date) => new Date(realDate.getTime() + shiftMs);

let db: PGlite;
const roundIds = new Map<number, number>();
const apiCalls: Array<{ endpoint: string; at: Date }> = [];

/** API-Football falsa: status pelo relógio simulado e scouts das gravações. */
function fakeApi(endpoint: string, now: Date): unknown[] {
  apiCalls.push({ endpoint, at: now });
  const ids = /^\/fixtures\?ids=([\d-]+)$/.exec(endpoint);
  if (ids) {
    return ids[1].split("-").map(Number).map((id) => {
      const fixture = round32.fixtures.find((item) => item.fixture.id === id)!;
      const start = simulated(new Date(fixture.fixture.date));
      const finished = now.getTime() >= start.getTime() + GAME_MINUTES * MINUTE;
      const short = now < start ? "NS" : finished ? fixture.fixture.status.short : "2H";
      return { fixture: { id, status: { short } }, goals: finished ? fixture.goals : { home: 0, away: 0 } };
    });
  }
  const scouts = /^\/fixtures\/(players|events)\?fixture=(\d+)$/.exec(endpoint);
  if (scouts) return recording(Number(scouts[2]))[scouts[1] as "players" | "events"];
  throw new Error(`Endpoint inesperado na API falsa: ${endpoint}`);
}

/** Grava os scouts e pontua o jogo, como a Edge Function `score-match`. */
async function scoreMatch(gameId: number, conferencia: boolean, now: Date) {
  const game = (await db.query<{ id: number; rodada_id: number; api_football_id: number; clube_casa_id: number; clube_fora_id: number; gols_casa: number; gols_fora: number }>(
    "select id, rodada_id, api_football_id, clube_casa_id, clube_fora_id, gols_casa, gols_fora from jogos where id = $1", [gameId],
  )).rows[0];
  const playerGroups = fakeApi(`/fixtures/players?fixture=${game.api_football_id}`, now) as ApiPlayerGroup[];
  const events = fakeApi(`/fixtures/events?fixture=${game.api_football_id}`, now) as ApiEvent[];
  const players = await db.query<{ id: number; api_football_id: number }>("select id, api_football_id from jogadores where api_football_id is not null");
  const clubs = await db.query<{ id: number; api_football_id: number }>("select id, api_football_id from clubes where api_football_id is not null");
  const rows = buildScouts({
    jogo: game,
    playerGroups,
    events,
    jogadorIdByApiId: new Map(players.rows.map((row) => [row.api_football_id, row.id])),
    clubeIdByApiId: new Map(clubs.rows.map((row) => [row.api_football_id, row.id])),
    conferencia,
    lidoEm: now.toISOString(),
  });
  for (const row of rows) {
    const columns = Object.keys(row) as Array<keyof typeof row>;
    await db.query(
      `insert into estatisticas_jogador (${columns.join(", ")}) values (${columns.map((_, index) => `$${index + 1}`).join(", ")})
       on conflict (jogo_id, jogador_id) do update set ${columns.map((column) => `${column} = excluded.${column}`).join(", ")}`,
      columns.map((column) => column === "payload_api" ? JSON.stringify(row[column]) : row[column]),
    );
  }
  await db.query("select fn_pontuar_jogo($1)", [gameId]);
  const update = { ...successfulAttemptUpdate, ...(conferencia ? { conferido_em: now.toISOString() } : {}) };
  await updateRow("jogos", gameId, update);
}

async function updateRow(table: "jogos" | "rodadas", id: number, values: Record<string, unknown>) {
  const columns = Object.keys(values);
  await db.query(`update ${table} set ${columns.map((column, index) => `${column} = $${index + 2}`).join(", ")} where id = $1`, [id, ...Object.values(values)]);
}

async function loadGames(roundId: number) {
  return (await db.query<FlowGame>(
    `select id, api_football_id, status::text, inicio_em::text, pontuado_em::text, conferido_em::text, pontuacao_tentativas, pontuacao_proxima_tentativa_em::text
     from jogos where rodada_id = $1`, [roundId],
  )).rows;
}

/** Uma execução do orquestrador `advance-round` no instante `now`. */
async function tick(now: Date) {
  const rounds = (await db.query<{ id: number; status: string; abre_em: string | null; trava_em: string; fechamento_simulado_em: string | null }>(
    "select id, status::text, abre_em::text, trava_em::text, fechamento_simulado_em::text from rodadas where temporada = $1 and not simulada and status <> 'FECHADA' order by numero", [SEASON],
  )).rows;
  for (const round of rounds) {
    for (const next of dueRoundTransitions(round, now)) {
      await updateRow("rodadas", round.id, { status: next });
      if (next === "ABERTA") await db.query("select fn_inicializar_ranking_rodada($1)", [round.id]);
      round.status = next;
    }
  }
  for (const round of rounds.filter((item) => item.status === "EM_ANDAMENTO")) {
    let games = await loadGames(round.id);
    for (const batch of chunk(gamesToPoll(games, now))) {
      const fixtures = fakeApi(`/fixtures?ids=${batch.map((game) => game.api_football_id).join("-")}`, now) as Array<{ fixture: { id: number } }>;
      const byApiId = new Map(fixtures.map((fixture) => [fixture.fixture.id, fixture]));
      for (const game of batch) {
        const update = gameUpdateFromFixture(game, byApiId.get(game.api_football_id!), now.toISOString());
        if (update) await updateRow("jogos", game.id, update);
      }
    }
    games = await loadGames(round.id);
    for (const game of interruptedToSettle(games)) {
      if (!game.pontuado_em) await db.query("select fn_pontuar_jogo($1)", [game.id]);
      await updateRow("jogos", game.id, { conferido_em: now.toISOString() });
    }
    for (const game of gamesToScore(games, false, now, DEFAULT_MAX_SCORING_ATTEMPTS).due) await scoreMatch(game.id, false, now);
    games = await loadGames(round.id);
    if (!isRoundResolved(games)) continue;
    const checkAt = round.fechamento_simulado_em ?? checkAtFor(games);
    if (!round.fechamento_simulado_em) await updateRow("rodadas", round.id, { fechamento_simulado_em: checkAt });
    if (now < new Date(checkAt)) continue;
    for (const game of gamesToScore(games, true, now, DEFAULT_MAX_SCORING_ATTEMPTS).due) await scoreMatch(game.id, true, now);
    if ((await loadGames(round.id)).some((game) => !game.conferido_em)) continue;
    await db.query("select fn_atualizar_precos($1)", [round.id]);
    await db.query("select fn_creditar_saldos_rodada($1)", [round.id]);
    await updateRow("rodadas", round.id, { status: "FECHADA", fechada_em: now.toISOString() });
  }
}

/** Salva a escalação como o usuário autenticado, pela função do banco (com RLS), e confirma a transação. */
async function saveLineup(userId: string, playerIds: number[]) {
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await tx.query("select fn_salvar_escalacao($1, '4-3-3'::formacao, $2)", [roundIds.get(ROUND), playerIds]);
  });
}

/** Escalação 4-3-3 com jogadores que entraram em campo, ordenados pela nota da API. */
function pickLineup(best: boolean, exclude: Set<number>) {
  const played = round32.fixtures.flatMap((fixture) => recording(fixture.fixture.id).players.flatMap((group) => group.players))
    .filter((entry: ApiPlayerStatistic) => (entry.statistics[0]?.games?.minutes ?? 0) >= 60 && !exclude.has(PLAYER_ID_OFFSET + entry.player.id))
    .map((entry) => ({ id: PLAYER_ID_OFFSET + entry.player.id, posicao: positionFromApi(entry.statistics[0].games?.position), nota: Number(entry.statistics[0].games?.rating ?? 0) }))
    .sort((a, b) => best ? b.nota - a.nota || a.id - b.id : a.nota - b.nota || a.id - b.id);
  return Object.entries({ GOL: 1, DEF: 4, MEI: 3, ATA: 3 }).flatMap(([posicao, total]) => played.filter((player) => player.posicao === posicao).slice(0, total).map((player) => player.id));
}

const num = (value: unknown) => Number(value);

describe(`rodada ${ROUND} de ${SEASON} de ponta a ponta, com respostas reais da API-Football`, () => {
  let anaLineup: number[];

  beforeAll(async () => {
    db = await createMigratedDatabase();
    const now = new Date().toISOString();

    const { clubs } = buildClubs(teams, [], now);
    for (const club of clubs) {
      await db.query("insert into clubes (id, api_football_id, nome, sigla, logo_url, ativo) values ($1, $2, $3, $4, $5, true)", [club.id, club.api_football_id, club.nome, club.sigla, club.logo_url]);
    }
    const clubIdByApiId = new Map(clubs.map((club) => [club.api_football_id, club.id]));
    const seen = new Set<number>();
    for (const fixture of round32.fixtures) {
      const fixtureTeams = [fixture.teams.home.id, fixture.teams.away.id];
      const groups = recording(fixture.fixture.id).players;
      for (const group of groups) {
        // Mesmo caso tratado em `buildScouts`: um time pode vir com outro id (Chapecoense = 22722).
        const teamApiId = fixtureTeams.includes(group.team.id) ? group.team.id : fixtureTeams.find((id) => !groups.some((other) => other.team.id === id))!;
        for (const entry of group.players) {
          const posicao = positionFromApi(entry.statistics[0]?.games?.position);
          if (!posicao || seen.has(entry.player.id)) continue;
          seen.add(entry.player.id);
          await db.query(
            "insert into jogadores (id, api_football_id, clube_id, nome, nome_exibicao, posicao, preco, preco_inicial) values ($1, $2, $3, $4, left($4, 16), $5, 5, 5)",
            [PLAYER_ID_OFFSET + entry.player.id, entry.player.id, clubIdByApiId.get(teamApiId), (entry.player as { name?: string | null }).name ?? `Jogador ${entry.player.id}`, posicao],
          );
        }
      }
    }

    for (const round of [round32, round33]) {
      const inserted = await db.query<{ id: number }>(
        "insert into rodadas (temporada, numero, status, abre_em, trava_em, rotulo_api) values ($1, $2, 'AGENDADA', $3, $4, $5) returning id",
        [SEASON, round.numero, shifted(round.abre_em), shifted(round.trava_em), round.rotulo_api],
      );
      const roundId = Number(inserted.rows[0].id);
      roundIds.set(round.numero, roundId);
      for (const fixture of round.fixtures) {
        // O calendário gravado já tem o resultado; a rodada começa com todos os jogos por jogar.
        const row = { ...gameRow(fixture, { rodadaId: roundId, clubIdByApiId, now }), inicio_em: shifted(fixture.fixture.date), status: "A_JOGAR", status_api: "NS", gols_casa: null, gols_fora: null };
        const columns = Object.keys(row);
        await db.query(`insert into jogos (${columns.join(", ")}) values (${columns.map((_, index) => `$${index + 1}`).join(", ")})`, Object.values(row));
      }
    }

    for (const [id, apelido] of [[ANA, "ana"], [BIA, "bia"], [CAIO, "caio"]] as const) await seedUser(db, id, apelido);
    await db.query("insert into ligas (id, nome, dono_id, codigo_convite, temporada) values ($1, 'Grupo E2E', $2, 'E2ETESTE', $3)", [LEAGUE, ANA, SEASON]);
    for (const id of [ANA, BIA, CAIO]) await db.query("insert into ligas_membros (liga_id, usuario_id) values ($1, $2)", [LEAGUE, id]);
  }, 120_000);

  it("usa o calendário real: 10 jogos, trava 1 h antes do primeiro e abertura da 33 no dia seguinte ao último", () => {
    expect(round32.fixtures).toHaveLength(10);
    expect(round32.trava_em).toBe("2026-10-23T22:00:00.000Z");
    expect(round33.abre_em).toBe("2026-10-27T03:00:00.000Z");
  });

  it("abre a rodada no horário de abertura, sem consultar a API", async () => {
    await tick(simulated(atReal(round32.abre_em, -1)));
    expect((await db.query("select status from rodadas where id = $1", [roundIds.get(ROUND)])).rows[0]).toEqual({ status: "AGENDADA" });
    await tick(simulated(atReal(round32.abre_em)));
    expect((await db.query("select status from rodadas where id = $1", [roundIds.get(ROUND)])).rows[0]).toEqual({ status: "ABERTA" });
    expect(apiCalls).toHaveLength(0);
  });

  it("aceita escalações dentro do saldo enquanto a rodada está aberta", async () => {
    anaLineup = pickLineup(true, new Set());
    const biaLineup = pickLineup(false, new Set(anaLineup));
    expect(anaLineup).toHaveLength(11);
    expect(biaLineup).toHaveLength(11);
    await saveLineup(ANA, anaLineup);
    await saveLineup(BIA, biaLineup);
    const teamsSaved = await db.query<{ usuario_id: string; custo: string }>("select usuario_id, custo from times where rodada_id = $1 order by usuario_id", [roundIds.get(ROUND)]);
    expect(teamsSaved.rows.map((row) => [row.usuario_id, num(row.custo)])).toEqual([[ANA, 55], [BIA, 55]]);
  });

  it("trava no horário e recusa escalações depois disso", async () => {
    await tick(simulated(atReal(round32.trava_em)));
    expect((await db.query("select status from rodadas where id = $1", [roundIds.get(ROUND)])).rows[0]).toEqual({ status: "EM_ANDAMENTO" });
    await expect(saveLineup(CAIO, anaLineup)).rejects.toMatchObject({ code: "ES423" });
    expect(apiCalls).toHaveLength(0);
  });

  it("acompanha os jogos ao vivo e pontua cada um ao encerrar", async () => {
    const starts = [...new Set(round32.fixtures.map((fixture) => fixture.fixture.date))].sort();
    const ticks = starts.flatMap((date) => [atReal(date, 30), atReal(date, GAME_MINUTES + 5)]).sort((a, b) => a.getTime() - b.getTime());
    for (const at of ticks) await tick(simulated(at));

    const games = await db.query<{ api_football_id: number; status: string; status_api: string; gols_casa: number; gols_fora: number; pontuado: boolean }>(
      "select api_football_id, status, status_api, gols_casa, gols_fora, pontuado_em is not null as pontuado from jogos where rodada_id = $1", [roundIds.get(ROUND)],
    );
    expect(games.rows).toHaveLength(10);
    for (const game of games.rows) {
      const fixture = round32.fixtures.find((item) => item.fixture.id === game.api_football_id)!;
      expect(game).toMatchObject({ status: "ENCERRADO", status_api: "FT", gols_casa: fixture.goals!.home, gols_fora: fixture.goals!.away, pontuado: true });
    }
  });

  it("os scouts reais batem com o placar de cada jogo, inclusive quando a API troca o id do time", async () => {
    const goals = await db.query<{ api_football_id: number; gols_casa: number; gols_fora: number; marcados_casa: number; marcados_fora: number }>(
      `select j.api_football_id, j.gols_casa, j.gols_fora,
         coalesce(sum(case when e.clube_id = j.clube_casa_id then e.gols else e.gols_contra end), 0)::int as marcados_casa,
         coalesce(sum(case when e.clube_id = j.clube_fora_id then e.gols else e.gols_contra end), 0)::int as marcados_fora
       from jogos j left join estatisticas_jogador e on e.jogo_id = j.id
       where j.rodada_id = $1 group by j.id`, [roundIds.get(ROUND)],
    );
    for (const game of goals.rows) expect([game.marcados_casa, game.marcados_fora]).toEqual([game.gols_casa, game.gols_fora]);
  });

  it("pênalti cometido desconta pontos com a grafia real da API (`commited`)", async () => {
    const result = await db.query<{ penaltis_cometidos: number }>("select penaltis_cometidos from estatisticas_jogador where jogador_id = $1", [PLAYER_ID_OFFSET + 152410]);
    expect(result.rows).toEqual([{ penaltis_cometidos: 2 }]);
  });

  it("confere, atualiza preços, credita saldos e fecha a rodada", async () => {
    const lastGame = round32.fixtures.map((fixture) => fixture.fixture.date).sort().at(-1)!;
    await tick(simulated(atReal(lastGame, GAME_MINUTES + 10)));

    const round = await db.query<{ status: string }>("select status from rodadas where id = $1", [roundIds.get(ROUND)]);
    expect(round.rows[0].status).toBe("FECHADA");
    const unchecked = await db.query<{ n: number }>("select count(*)::int as n from jogos where rodada_id = $1 and conferido_em is null", [roundIds.get(ROUND)]);
    expect(unchecked.rows[0].n).toBe(0);

    // Os preços novos valem para a rodada seguinte e ficam registrados nela.
    const prices = await db.query<{ n: number; min: string; max: string }>("select count(*)::int as n, min(preco) as min, max(preco) as max from historico_precos where rodada_id = $1", [roundIds.get(ROUND + 1)]);
    expect(prices.rows[0].n).toBeGreaterThan(0);
    expect(num(prices.rows[0].min)).toBeGreaterThanOrEqual(2);
    expect(num(prices.rows[0].max)).toBeLessThanOrEqual(20);

    // Saldo: C$ 60 + soma de max(pontos − preço pago, 0) dos jogadores escalados.
    const expected = await db.query<{ usuario_id: string; esperado: string; saldo: string }>(
      `select t.usuario_id, 60 + sum(greatest(coalesce(e.pontos, 0) - tj.preco_pago, 0)) as esperado, c.saldo
       from times t join times_jogadores tj on tj.time_id = t.id
       left join estatisticas_jogador e on e.jogador_id = tj.jogador_id and e.rodada_id = t.rodada_id
       join carteiras c on c.usuario_id = t.usuario_id
       where t.rodada_id = $1 group by t.usuario_id, c.saldo`, [roundIds.get(ROUND)],
    );
    expect(expected.rows).toHaveLength(2);
    for (const row of expected.rows) expect(num(row.saldo)).toBeCloseTo(num(row.esperado), 2);
    const caio = await db.query<{ saldo: string }>("select saldo from carteiras where usuario_id = $1", [CAIO]);
    expect(num(caio.rows[0].saldo)).toBe(60);
  });

  it("pontos dos times e ranking da rodada batem com os scouts", async () => {
    const totals = await db.query<{ usuario_id: string; pontos: string; soma: string }>(
      `select t.usuario_id, t.pontos, coalesce(sum(e.pontos), 0) as soma
       from times t join times_jogadores tj on tj.time_id = t.id
       left join estatisticas_jogador e on e.jogador_id = tj.jogador_id and e.rodada_id = t.rodada_id
       where t.rodada_id = $1 group by t.id`, [roundIds.get(ROUND)],
    );
    for (const row of totals.rows) expect(num(row.pontos)).toBeCloseTo(num(row.soma), 2);
    const byPoints = [...totals.rows].sort((a, b) => num(b.pontos) - num(a.pontos)).map((row) => row.usuario_id);

    const ranking = await db.query<{ usuario_id: string; posicao: number }>("select usuario_id, posicao from ranking_rodada where rodada_id = $1 and usuario_id <> $2 order by posicao", [roundIds.get(ROUND), CAIO]);
    expect(ranking.rows.map((row) => row.usuario_id)).toEqual(byPoints);
  });

  it("o campeonato do grupo soma a rodada e conta 0 para quem não escalou", async () => {
    const rows = await db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [ANA]);
      return (await tx.query<{ usuario_id: string; pontos: string }>("select usuario_id, pontos from fn_ranking_campeonato($1, $2::smallint, false)", [LEAGUE, SEASON])).rows;
    });
    const roundPoints = await db.query<{ usuario_id: string; pontos: string }>("select usuario_id, pontos from times where rodada_id = $1", [roundIds.get(ROUND)]);
    const expected = new Map(roundPoints.rows.map((row) => [row.usuario_id, num(row.pontos)]));
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(num(row.pontos)).toBeCloseTo(expected.get(row.usuario_id) ?? 0, 2);
  });

  it("abre a rodada seguinte pelo próprio horário de abertura", async () => {
    await tick(simulated(atReal(round33.abre_em)));
    const next = await db.query<{ status: string }>("select status from rodadas where id = $1", [roundIds.get(ROUND + 1)]);
    expect(next.rows[0].status).toBe("ABERTA");
  });

  it("só consulta a API durante os jogos e gasta poucas requisições na rodada", () => {
    const firstStart = simulated(new Date(round32.fixtures.map((fixture) => fixture.fixture.date).sort()[0]));
    expect(apiCalls.every((call) => call.at >= firstStart)).toBe(true);
    const scouts = apiCalls.filter((call) => call.endpoint.startsWith("/fixtures/")).length;
    expect(scouts).toBe(10 * 2 * 2); // jogadores + eventos, na pontuação e na conferência
    expect(apiCalls.length).toBeLessThan(100);
  });
});
