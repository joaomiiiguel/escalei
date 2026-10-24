// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { buildScouts, type ApiEvent, type ApiPlayerGroup } from "@/supabase/functions/_shared/scouts";
import players from "../fixtures/api-football/fixture-1001-players.json";
import playersConferencia from "../fixtures/api-football/fixture-1001-players-conferencia.json";
import events from "../fixtures/api-football/fixture-1001-events.json";
import { createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, seedRound, seedUser } from "./seed";

const LOCAL_PLAYER_IDS = new Map([[9001, 101], [9002, 102], [9003, 103], [9004, 104], [9005, 105], [9006, 106]]);
const LOCAL_CLUB_IDS = new Map([[100, 1], [200, 2]]);

let db: PGlite;
let roundId: number;

/** Grava os scouts das fixtures em `estatisticas_jogador`, como faz o `score-match`. */
async function storeScouts(payload: { response: unknown }, conferencia: boolean) {
  const rows = buildScouts({
    jogo: { id: 1001, rodada_id: roundId, clube_casa_id: 1, clube_fora_id: 2, gols_casa: 3, gols_fora: 0 },
    playerGroups: payload.response as ApiPlayerGroup[],
    events: events.response as ApiEvent[],
    jogadorIdByApiId: LOCAL_PLAYER_IDS,
    clubeIdByApiId: LOCAL_CLUB_IDS,
    conferencia,
    lidoEm: new Date().toISOString(),
  });
  for (const row of rows) {
    const columns = Object.keys(row);
    const values = columns.map((column) => column === "payload_api" ? JSON.stringify(row[column as keyof typeof row]) : row[column as keyof typeof row]);
    await db.query(
      `insert into estatisticas_jogador (${columns.join(", ")}) values (${columns.map((_, index) => `$${index + 1}`).join(", ")})
       on conflict (jogo_id, jogador_id) do update set ${columns.map((column) => `${column} = excluded.${column}`).join(", ")}`,
      values,
    );
  }
}

async function playerPoints() {
  const result = await db.query<{ jogador_id: number; pontos: string }>("select jogador_id, pontos from estatisticas_jogador where jogo_id = 1001 order by jogador_id");
  return Object.fromEntries(result.rows.map((row) => [row.jogador_id, Number(row.pontos)]));
}

async function teamPoints() {
  const result = await db.query<{ usuario_id: string; pontos: string; gols_escalados: number }>("select usuario_id, pontos, gols_escalados from times where rodada_id = $1", [roundId]);
  return Object.fromEntries(result.rows.map((row) => [row.usuario_id, { pontos: Number(row.pontos), gols: row.gols_escalados }]));
}

describe("pontuação por jogo encerrado (fn_pontuar_jogo)", () => {
  beforeAll(async () => {
    db = await createMigratedDatabase();
    await db.exec(`
      insert into clubes (id, nome, sigla) values (1, 'Clube Casa', 'CAS'), (2, 'Clube Visitante', 'VIS'), (3, 'Clube Adiado', 'ADI'), (4, 'Clube Rival', 'RIV');
      insert into jogadores (id, clube_id, nome, nome_exibicao, posicao, preco, preco_inicial) values
        (101, 1, 'Goleiro Casa', 'Goleiro', 'GOL', 5, 5),
        (102, 1, 'Zagueiro Casa', 'Zagueiro', 'DEF', 5, 5),
        (103, 1, 'Lateral Reserva', 'Lateral', 'DEF', 5, 5),
        (104, 1, 'Atacante Casa', 'Atacante', 'ATA', 5, 5),
        (105, 2, 'Meia Visitante', 'Meia', 'MEI', 5, 5),
        (106, 2, 'Goleiro Reserva', 'Reserva', 'GOL', 5, 5),
        (107, 3, 'Meia Adiado', 'Adiado', 'MEI', 5, 5);
    `);
    await seedUser(db, USER_A, "usuario_a");
    await seedUser(db, USER_B, "usuario_b");
    roundId = await seedRound(db, 1, "EM_ANDAMENTO", "-2 hours");
    await db.query(
      `insert into jogos (id, rodada_id, clube_casa_id, clube_fora_id, inicio_em, status, gols_casa, gols_fora) values
        (1001, $1, 1, 2, now() - interval '2 hours', 'ENCERRADO', 3, 0),
        (1002, $1, 3, 4, now() - interval '2 hours', 'ADIADO', null, null)`,
      [roundId],
    );
    for (const [userId, playerIds] of [[USER_A, [101, 102, 104, 107]], [USER_B, [103, 105, 106]]] as const) {
      const team = await db.query<{ id: string }>("insert into times (usuario_id, rodada_id, formacao, custo) values ($1, $2, '4-3-3', 20) returning id", [userId, roundId]);
      for (const playerId of playerIds) {
        await db.query("insert into times_jogadores (time_id, jogador_id, posicao, preco_pago) select $1, id, posicao, preco from jogadores where id = $2", [team.rows[0].id, playerId]);
      }
    }
    await storeScouts(players, false);
    await db.query("select fn_pontuar_jogo(1001)");
  }, 60_000);

  it("aplica a tabela de pontuação da versão 1 por posição", async () => {
    expect(await playerPoints()).toEqual({
      101: 8.9, // 3 defesas (1,3) + clean sheet de goleiro (5)
      102: 15, // gol (8) + 2 desarmes (1,5) + clean sheet de defensor (5) − amarelo (1)
      103: 0, // reserva com 30 min e scouts nulos; sem clean sheet
      104: 10.7, // gol (8) + 1 finalização no gol além do gol (1,2) + 2 fora (0,8) − impedimento (0,1)
      105: -6.6, // vermelho (−3) + 2 faltas (−0,3) + gol contra (−3)
      106: 0, // não entrou em campo
    });
  });

  it("soma os pontos e gols de cada time e atualiza o ranking com desempate", async () => {
    expect(await teamPoints()).toEqual({
      [USER_A]: { pontos: 34.6, gols: 2 },
      [USER_B]: { pontos: -6.6, gols: 0 },
    });
    const ranking = await db.query<{ usuario_id: string; posicao: number }>("select usuario_id, posicao from ranking_rodada where rodada_id = $1 order by posicao", [roundId]);
    expect(ranking.rows).toEqual([{ usuario_id: USER_A, posicao: 1 }, { usuario_id: USER_B, posicao: 2 }]);
  });

  it("jogador de jogo adiado fica com 0 e o jogo não é marcado como pontuado", async () => {
    const result = await db.query<{ pontos: string; pontuado: boolean }>("select pontos, pontuado from times_jogadores where jogador_id = 107");
    expect(result.rows).toEqual([{ pontos: "0.00", pontuado: false }]);
    const game = await db.query<{ pontuado_em: string | null }>("select pontuado_em from jogos where id = 1002");
    expect(game.rows[0].pontuado_em).toBeNull();
  });

  it("recalcula tudo na conferência pós-jogo quando a API corrige os scouts", async () => {
    await storeScouts(playersConferencia, true);
    await db.query("select fn_pontuar_jogo(1001)");
    const points = await playerPoints();
    expect(points[102]).toBe(16); // amarelo anulado
    expect(points[104]).toBe(11.1); // 2 finalizações no gol além do gol + 1 fora
    expect((await teamPoints())[USER_A].pontos).toBe(36);
    const reading = await db.query<{ versao_leitura: number }>("select distinct versao_leitura from estatisticas_jogador where jogo_id = 1001");
    expect(reading.rows).toEqual([{ versao_leitura: 2 }]);
  });

  it("é idempotente: pontuar de novo não altera o resultado", async () => {
    const before = await teamPoints();
    await db.query("select fn_pontuar_jogo(1001)");
    expect(await teamPoints()).toEqual(before);
  });

  it("não pode ser chamada por usuários", async () => {
    await expect(db.transaction(async (tx) => {
      await tx.exec("set local role authenticated");
      await tx.query("select fn_pontuar_jogo(1001)");
    })).rejects.toThrow(/permission denied/);
  });
});
