// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, seedUser } from "./seed";

const GRANT = "select fn_admin_conceder_passes($1, $2, $3) as disponiveis";
const MISSING_USER = "00000000-0000-4000-8000-0000000000ff";

async function asServiceRole<T>(db: PGlite, fn: (tx: Parameters<Parameters<PGlite["transaction"]>[0]>[0]) => Promise<T>): Promise<T> {
  let result: T | undefined;
  let failure: unknown;
  await db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    try {
      result = await fn(tx);
    } catch (error) {
      failure = error;
    }
    await tx.rollback();
  });
  if (failure) throw failure;
  return result as T;
}

describe("fn_admin_conceder_passes", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedDatabase();
    await seedUser(db, USER_A, "admin");
    await seedUser(db, USER_B, "participante");
    await db.query("insert into administradores (usuario_id, nome) values ($1, 'Admin')", [USER_A]);
  }, 60_000);

  it("cria lote de cortesia com autor, crédito no livro e devolve o total disponível", async () => {
    const { total, lots, credits } = await asServiceRole(db, async (tx) => {
      const granted = await tx.query<{ disponiveis: number }>(GRANT, [USER_A, USER_B, 3]);
      const lotRows = await tx.query("select origem, quantidade, restantes, valido_ate_temporada, concedido_por from passes_lotes where usuario_id = $1 and concedido_por is not null", [USER_B]);
      const creditRows = await tx.query("select tipo, quantidade from passes_movimentacoes where usuario_id = $1 order by id", [USER_B]);
      return { total: granted.rows[0].disponiveis, lots: lotRows.rows, credits: creditRows.rows };
    });

    expect(total).toBe(5); // 2 da cortesia do onboarding + 3 concedidos
    expect(lots).toEqual([{ origem: "CORTESIA", quantidade: 3, restantes: 3, valido_ate_temporada: 2027, concedido_por: USER_A }]);
    expect(credits).toEqual([{ tipo: "CREDITO", quantidade: 2 }, { tipo: "CREDITO", quantidade: 3 }]);
  });

  it("recusa quem não é administrador", async () => {
    await expect(asServiceRole(db, (tx) => tx.query(GRANT, [USER_B, USER_B, 1]))).rejects.toMatchObject({ code: "ES403" });
  });

  it("recusa quantidade fora de 1 a 10 e participante inexistente", async () => {
    await expect(asServiceRole(db, (tx) => tx.query(GRANT, [USER_A, USER_B, 0]))).rejects.toMatchObject({ code: "ES422" });
    await expect(asServiceRole(db, (tx) => tx.query(GRANT, [USER_A, USER_B, 11]))).rejects.toMatchObject({ code: "ES422" });
    await expect(asServiceRole(db, (tx) => tx.query(GRANT, [USER_A, MISSING_USER, 1]))).rejects.toMatchObject({ code: "ES404" });
  });

  it("não pode ser chamada pelo cliente, nem por um administrador logado", async () => {
    await expect(asUser(db, USER_A, (tx) => tx.query(GRANT, [USER_A, USER_A, 5]))).rejects.toThrow(/permission denied/);
  });
});
