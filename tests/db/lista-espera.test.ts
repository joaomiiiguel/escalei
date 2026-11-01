// @vitest-environment node
import { describe, expect, it } from "vitest";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { seedUser, USER_A } from "./seed";

describe("lista de espera no banco", () => {
  it("não é acessível por visitantes nem usuários autenticados", async () => {
    const database = await createMigratedDatabase();
    await database.query("insert into lista_espera (nome, whatsapp, email) values ('Ana', '11987654321', 'ana@exemplo.com')");
    await expect(database.query("insert into lista_espera (nome, whatsapp, email) values ('Ana', '11987654321', 'ANA@exemplo.com')")).rejects.toThrow(/duplicate key/);
    await expect(asUser(database, USER_A, (tx) => tx.query("select * from lista_espera"))).rejects.toThrow(/permission denied/);
  }, 60_000);

  it("guarda o aceite e o mantém legível se o grupo for apagado", async () => {
    const database = await createMigratedDatabase();
    await seedUser(database, USER_A, "gestor");
    const { rows } = await database.query<{ id: string }>("insert into ligas (nome, dono_id, codigo_convite, temporada) values ('Resenha', $1, 'ABCD2345', 2026) returning id", [USER_A]);
    await database.query("insert into lista_espera (nome, whatsapp, email, liga_id, aceito_em, aceito_por) values ('Ana', '11987654321', 'ana@exemplo.com', $1, now(), $2)", [rows[0].id, USER_A]);

    await database.query("delete from ligas where id = $1", [rows[0].id]);
    const { rows: signups } = await database.query<{ liga_id: string | null; aceito_em: string | null }>("select liga_id, aceito_em from lista_espera");
    expect(signups).toHaveLength(1);
    expect(signups[0].liga_id).toBeNull();
    expect(signups[0].aceito_em).not.toBeNull();
  }, 60_000);
});
