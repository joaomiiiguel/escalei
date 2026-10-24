// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, seedRound, seedUser } from "./seed";

const USER_C = "00000000-0000-4000-8000-00000000000c";
const OUTSIDER = "00000000-0000-4000-8000-00000000000d";
const LEAGUE = "10000000-0000-4000-8000-000000000001";

let db: PGlite;

type Row = { usuario_id: string; apelido: string; pontos: string; rodadas_disputadas: number; gols_escalados: number; posicao: number };

async function ranking(userId: string, temporada = 2026, simulada = false) {
  return asUser(db, userId, async (tx) => (await tx.query<Row>("select * from fn_ranking_campeonato($1, $2, $3)", [LEAGUE, temporada, simulada])).rows);
}

async function team(userId: string, roundId: number, pontos: number, gols: number) {
  await db.query("insert into times (usuario_id, rodada_id, formacao, custo, pontos, gols_escalados) values ($1, $2, '4-3-3', 50, $3, $4)", [userId, roundId, pontos, gols]);
}

describe("ranking do campeonato do grupo", () => {
  beforeAll(async () => {
    db = await createMigratedDatabase();
    await seedUser(db, USER_A, "ana");
    await seedUser(db, USER_B, "bruno");
    await seedUser(db, USER_C, "carla");
    await seedUser(db, OUTSIDER, "fora");
    await db.query("insert into ligas (id, nome, dono_id, codigo_convite, temporada) values ($1, 'Amigos do Bairro', $2, 'ABCDEFGH', 2026)", [LEAGUE, USER_A]);
    for (const userId of [USER_A, USER_B, USER_C]) {
      await db.query("insert into ligas_membros (liga_id, usuario_id) values ($1, $2)", [LEAGUE, userId]);
    }
    const closed1 = await seedRound(db, 1, "FECHADA", "-14 days");
    const closed2 = await seedRound(db, 2, "FECHADA", "-7 days");
    const live = await seedRound(db, 3, "EM_ANDAMENTO", "-1 hour");
    const open = await seedRound(db, 4, "ABERTA", "6 days");
    const otherSeason = await seedRound(db, 1, "FECHADA", "-400 days", 2025);
    await team(USER_A, closed1, 40, 2);
    await team(USER_A, closed2, 30, 1);
    await team(USER_A, live, 10, 0);
    await team(USER_A, open, 999, 9); // rodada ainda não travada: não conta
    await team(USER_B, closed1, 50, 3);
    await team(USER_B, live, 30, 1);
    await team(USER_B, otherSeason, 500, 5); // outra temporada: não conta
    await team(OUTSIDER, closed1, 300, 9); // fora do grupo: não aparece
  }, 60_000);

  it("soma os pontos das rodadas travadas da temporada e desempata pelos gols dos escalados", async () => {
    expect(await ranking(USER_A)).toEqual([
      { usuario_id: USER_B, apelido: "bruno", clube_sigla: null, pontos: "80.00", rodadas_disputadas: 2, gols_escalados: 4, posicao: 1 },
      { usuario_id: USER_A, apelido: "ana", clube_sigla: null, pontos: "80.00", rodadas_disputadas: 3, gols_escalados: 3, posicao: 2 },
      { usuario_id: USER_C, apelido: "carla", clube_sigla: null, pontos: "0.00", rodadas_disputadas: 0, gols_escalados: 0, posicao: 3 },
    ]);
  });

  it("empata na mesma posição quando pontos e gols são iguais", async () => {
    await db.query("update times set gols_escalados = gols_escalados + 1 where usuario_id = $1 and rodada_id = (select id from rodadas where temporada = 2026 and numero = 1)", [USER_A]);
    try {
      expect((await ranking(USER_A)).map((row) => [row.apelido, row.posicao])).toEqual([["ana", 1], ["bruno", 1], ["carla", 3]]);
    } finally {
      await db.query("update times set gols_escalados = gols_escalados - 1 where usuario_id = $1 and rodada_id = (select id from rodadas where temporada = 2026 and numero = 1)", [USER_A]);
    }
  });

  it("mantém membros sem escalação no fim com 0 pontos", async () => {
    const rows = await ranking(USER_C);
    expect(rows.at(-1)).toMatchObject({ apelido: "carla", pontos: "0.00", rodadas_disputadas: 0 });
  });

  it("separa temporadas e rodadas simuladas", async () => {
    const rows = await ranking(USER_A, 2025);
    expect(rows.find((row) => row.apelido === "bruno")?.pontos).toBe("500.00");
    expect((await ranking(USER_A, 2026, true)).every((row) => row.pontos === "0.00")).toBe(true);
  });

  it("recusa quem não participa do grupo", async () => {
    await expect(ranking(OUTSIDER)).rejects.toMatchObject({ code: "ES403" });
  });

  it("recusa grupos arquivados", async () => {
    await db.query("update ligas set arquivada_em = now() where id = $1", [LEAGUE]);
    try {
      await expect(ranking(USER_A)).rejects.toMatchObject({ code: "ES403" });
    } finally {
      await db.query("update ligas set arquivada_em = null where id = $1", [LEAGUE]);
    }
  });
});
