// @vitest-environment node
import { describe, expect, it } from "vitest";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A } from "./seed";

describe("sync_execucoes", () => {
  it("aceita execuções de todas as funções que chamam a API-Football e fica fora do alcance dos usuários", async () => {
    const db = await createMigratedDatabase();
    for (const tipo of ["RODADA", "JOGO", "PONTUACAO", "ORQUESTRADOR"]) {
      await db.query("insert into sync_execucoes (tipo, requisicoes, cota_restante, sucesso) values ($1, 2, 80, true)", [tipo]);
    }
    await expect(db.query("insert into sync_execucoes (tipo, sucesso) values ('OUTRO', true)")).rejects.toThrow(/sync_execucoes_tipo_check/);
    await expect(asUser(db, USER_A, (tx) => tx.query("select * from sync_execucoes"))).rejects.toThrow(/permission denied/);
  }, 60_000);
});
