// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, seedRound, seedUser } from "./seed";

const ADJUSTMENT = readFileSync(path.resolve(__dirname, "../../supabase/migrations/20261024170000_ajuste_saldo_inicial.sql"), "utf8");

describe("ajuste do saldo inicial para C$ 60", () => {
  it("credita +C$ 10 uma única vez a quem já tinha rendimento e registra a movimentação", async () => {
    const db = await createMigratedDatabase();
    await seedUser(db, USER_A, "veterano");
    await seedUser(db, USER_B, "novato");
    const roundId = await seedRound(db, 1, "FECHADA", "-7 days");
    const team = await db.query<{ id: string }>("insert into times (usuario_id, rodada_id, formacao, custo) values ($1, $2, '4-3-3', 50) returning id", [USER_A, roundId]);
    // Estado anterior ao ajuste: veterano partiu de C$ 50 e rendeu C$ 5,30; novato já começou com C$ 60.
    await db.query("delete from movimentacoes_saldo where tipo = 'AJUSTE_SALDO_INICIAL'");
    await db.query("update carteiras set saldo = 55.30 where usuario_id = $1", [USER_A]);
    await db.query(
      "insert into movimentacoes_saldo (usuario_id, rodada_id, time_id, tipo, valor, saldo_antes, saldo_depois) values ($1, $2, $3, 'RENDIMENTO', 5.30, 50, 55.30)",
      [USER_A, roundId, team.rows[0].id],
    );

    await db.exec(ADJUSTMENT.slice(ADJUSTMENT.indexOf("with alvos as")));
    await db.exec(ADJUSTMENT.slice(ADJUSTMENT.indexOf("with alvos as")));

    const wallets = await db.query<{ usuario_id: string; saldo: string }>("select usuario_id, saldo from carteiras order by usuario_id");
    expect(wallets.rows).toEqual([{ usuario_id: USER_A, saldo: "65.30" }, { usuario_id: USER_B, saldo: "60.00" }]);
    const adjustments = await db.query("select usuario_id, valor, saldo_antes, saldo_depois, rodada_id from movimentacoes_saldo where tipo = 'AJUSTE_SALDO_INICIAL'");
    expect(adjustments.rows).toEqual([{ usuario_id: USER_A, valor: "10.00", saldo_antes: "55.30", saldo_depois: "65.30", rodada_id: null }]);
  }, 60_000);

  it("continua exigindo rodada e time nos rendimentos", async () => {
    const db = await createMigratedDatabase();
    await seedUser(db, USER_A, "veterano");
    await expect(db.query("insert into movimentacoes_saldo (usuario_id, tipo, valor, saldo_antes, saldo_depois) values ($1, 'RENDIMENTO', 1, 60, 61)", [USER_A]))
      .rejects.toThrow(/movimentacoes_saldo_rendimento_com_rodada/);
  }, 60_000);
});
