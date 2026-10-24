// @vitest-environment node
import { describe, expect, it } from "vitest";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A } from "./seed";

describe("lista de espera no banco", () => {
  it("não é acessível por visitantes nem usuários autenticados", async () => {
    const database = await createMigratedDatabase();
    await database.query("insert into lista_espera (nome, whatsapp, email) values ('Ana', '11987654321', 'ana@exemplo.com')");
    await expect(database.query("insert into lista_espera (nome, whatsapp, email) values ('Ana', '11987654321', 'ANA@exemplo.com')")).rejects.toThrow(/duplicate key/);
    await expect(asUser(database, USER_A, (tx) => tx.query("select * from lista_espera"))).rejects.toThrow(/permission denied/);
  }, 60_000);
});
