// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyMigration, createMigratedDatabase } from "./supabase-pglite";
import { seedUser, USER_A } from "./seed";

const MIGRATION = "20261118160000_brasileiro_2026_grupo_geral.sql";
const insertLeague = "insert into ligas (nome, dono_id, codigo_convite, temporada, tipo) values ($1, $2, $3, 2026, $4) returning id";

describe("Brasileiro 2026 como grupo geral", () => {
  it("transforma o grupo do teste no grupo geral, sem o \"(Teste)\" no nome, mantendo os membros", async () => {
    const db = await createMigratedDatabase({ before: MIGRATION });
    await seedUser(db, USER_A, "Miguel");
    const { rows } = await db.query<{ id: string }>(insertLeague, ["Brasileiro 2026 (Teste)", USER_A, "ABCDEFGH", "CONVITE"]);
    await db.query("insert into ligas_membros (liga_id, usuario_id) values ($1, $2)", [rows[0].id, USER_A]);
    await db.query(insertLeague, ["Resenha", USER_A, "ABCDEFGJ", "CONVITE"]);

    await applyMigration(db, MIGRATION);

    expect((await db.query("select nome, tipo from ligas order by nome")).rows).toEqual([
      { nome: "Brasileiro 2026", tipo: "ABERTA" },
      { nome: "Resenha", tipo: "CONVITE" },
    ]);
    expect((await db.query("select usuario_id from ligas_membros where liga_id = $1", [rows[0].id])).rows).toEqual([{ usuario_id: USER_A }]);
  }, 60_000);

  it("não mexe se já houver outro grupo geral ativo ou se o grupo não existir", async () => {
    const db = await createMigratedDatabase({ before: MIGRATION });
    await seedUser(db, USER_A, "Miguel");
    await db.query(insertLeague, ["Geral", USER_A, "ABCDEFGH", "ABERTA"]);
    await db.query(insertLeague, ["Brasileiro 2026 (Teste)", USER_A, "ABCDEFGJ", "CONVITE"]);

    await applyMigration(db, MIGRATION);
    expect((await db.query("select nome, tipo from ligas order by nome")).rows).toEqual([
      { nome: "Brasileiro 2026 (Teste)", tipo: "CONVITE" },
      { nome: "Geral", tipo: "ABERTA" },
    ]);

    const empty = await createMigratedDatabase({ before: MIGRATION });
    await expect(applyMigration(empty, MIGRATION)).resolves.toBeUndefined();
  }, 60_000);
});
