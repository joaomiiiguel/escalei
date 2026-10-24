// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, lineup433, seedCatalog, seedRound, seedUser } from "./seed";

let db: PGlite;
let openRound: number;
let lockedRound: number;

async function save(userId: string, roundId: number, formation: string, players: number[]) {
  return asUser(db, userId, async (tx) => {
    const result = await tx.query<{ id: string }>("select fn_salvar_escalacao($1, $2::formacao, $3) as id", [roundId, formation, players]);
    const team = await tx.query<{ custo: string; jogadores: number }>(
      "select custo, (select count(*)::int from times_jogadores where time_id = times.id) as jogadores from times where id = $1",
      [result.rows[0].id],
    );
    return team.rows[0];
  });
}

describe("escalação validada no banco", () => {
  beforeAll(async () => {
    db = await createMigratedDatabase();
    await seedCatalog(db);
    await seedUser(db, USER_A, "usuario_a");
    await seedUser(db, USER_B, "usuario_b");
    openRound = await seedRound(db, 1, "ABERTA", "1 day");
    lockedRound = await seedRound(db, 2, "ABERTA", "-1 minute");
  }, 60_000);

  it("cria carteiras com saldo inicial de C$ 60", async () => {
    const result = await db.query<{ saldo: string }>("select saldo from carteiras where usuario_id = $1", [USER_A]);
    expect(Number(result.rows[0].saldo)).toBe(60);
  });

  it("salva uma escalação válida dentro do saldo de forma atômica", async () => {
    const team = await save(USER_A, openRound, "4-3-3", lineup433());
    expect(Number(team.custo)).toBe(55);
    expect(team.jogadores).toBe(11);
  });

  it("recusa salvar depois da trava", async () => {
    await expect(save(USER_A, lockedRound, "4-3-3", lineup433())).rejects.toMatchObject({
      code: "ES423",
      message: "A janela de edição desta rodada já foi encerrada.",
    });
  });

  it("recusa formação que não bate com as posições", async () => {
    await expect(save(USER_A, openRound, "4-4-2", lineup433())).rejects.toMatchObject({ code: "ES422", message: "Os jogadores não correspondem à formação escolhida." });
  });

  it("recusa menos de 11 jogadores distintos", async () => {
    const players = lineup433();
    players[10] = players[0];
    await expect(save(USER_A, openRound, "4-3-3", players)).rejects.toMatchObject({ code: "ES422", message: "Selecione os 11 jogadores antes de salvar." });
  });

  it("recusa custo acima do saldo atual", async () => {
    await db.query("update jogadores set preco = 20 where id = 19");
    try {
      await expect(save(USER_A, openRound, "4-3-3", lineup433())).rejects.toMatchObject({ code: "ES422", message: "A escalação ultrapassa o seu saldo disponível." });
    } finally {
      await db.query("update jogadores set preco = 5 where id = 19");
    }
  });

  it("aceita custo acima de C$ 100 quando o saldo permite", async () => {
    await db.query("update carteiras set saldo = 200 where usuario_id = $1", [USER_B]);
    await db.query("update jogadores set preco = 15 where id = any($1)", [lineup433()]);
    try {
      const team = await save(USER_B, openRound, "4-3-3", lineup433());
      expect(Number(team.custo)).toBe(165);
    } finally {
      await db.query("update jogadores set preco = 5");
    }
  });

  it("bloqueia escrita direta pela API depois da trava", async () => {
    const teamId = await db.query<{ id: string }>(
      "insert into times (usuario_id, rodada_id, formacao, custo) values ($1, $2, '4-3-3', 55) returning id",
      [USER_A, lockedRound],
    );
    await asUser(db, USER_A, async (tx) => {
      const updated = await tx.query("update times set formacao = '3-5-2' where id = $1", [teamId.rows[0].id]);
      expect(updated.affectedRows).toBe(0);
      await expect(tx.query("insert into times_jogadores (time_id, jogador_id, posicao, preco_pago) values ($1, 1, 'GOL', 5)", [teamId.rows[0].id]))
        .rejects.toThrow(/row-level security/);
    });
  });

  it("impede salvar sem usuário autenticado", async () => {
    await expect(save("", openRound, "4-3-3", lineup433())).rejects.toMatchObject({ code: "ES401" });
  });
});
