// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createMigratedDatabase } from "./supabase-pglite";
import { seedUser, USER_A } from "./seed";

const insertLeague = (code: string, type: "ABERTA" | "CONVITE") =>
  `insert into ligas (nome, dono_id, codigo_convite, temporada, tipo) values ('Grupo ${code}', '${USER_A}', '${code}', 2026, '${type}') returning id`;

describe("grupo geral no banco", () => {
  it("aceita só um grupo ABERTA ativo, e libera outro depois de arquivar", async () => {
    const database = await createMigratedDatabase();
    await seedUser(database, USER_A, "gestor");

    const { rows } = await database.query<{ id: string }>(insertLeague("ABCD2345", "ABERTA"));
    await database.query(insertLeague("ABCD2346", "CONVITE"));
    await database.query(insertLeague("ABCD2347", "CONVITE"));
    await expect(database.query(insertLeague("ABCD2348", "ABERTA"))).rejects.toThrow(/duplicate key/);

    await database.query("update ligas set arquivada_em = now() where id = $1", [rows[0].id]);
    await expect(database.query(insertLeague("ABCD2349", "ABERTA"))).resolves.toBeDefined();
  }, 60_000);
});
