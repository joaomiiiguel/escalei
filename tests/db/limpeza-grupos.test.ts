// @vitest-environment node
import { describe, expect, it } from "vitest";
import { applyMigration, createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, seedUser } from "./seed";

const LIMPEZA = "20261027220000_manter_apenas_grupo_brasileiro_2026.sql";

describe("limpeza dos grupos de teste", () => {
  it("mantém só o grupo Brasileiro 2026 (Teste) e inclui o Joao nele", async () => {
    const db = await createMigratedDatabase({ before: LIMPEZA });
    await seedUser(db, USER_A, "Miguel");
    await seedUser(db, USER_B, "Joao");
    const groups = ["Brasileiro 2026 (Teste)", "teste", "Tessaste", "Campina Resenha", "Resenha Mock da Rodada"];
    for (const [index, nome] of groups.entries()) {
      const league = await db.query<{ id: string }>("insert into ligas (nome, dono_id, codigo_convite, temporada) values ($1, $2, $3, 2026) returning id", [nome, USER_A, `ABCDEFG${"HJKMN"[index]}`]);
      await db.query("insert into ligas_membros (liga_id, usuario_id) values ($1, $2)", [league.rows[0].id, USER_A]);
      if (nome === "Resenha Mock da Rodada") {
        await db.query("insert into ligas_membros (liga_id, usuario_id) values ($1, $2)", [league.rows[0].id, USER_B]);
        await db.query("insert into ligas_convites_email (liga_id, email, convidado_por) values ($1, 'convidado@exemplo.test', $2)", [league.rows[0].id, USER_A]);
      }
    }

    await applyMigration(db, LIMPEZA);

    expect((await db.query("select nome from ligas")).rows).toEqual([{ nome: "Brasileiro 2026 (Teste)" }]);
    const members = await db.query<{ apelido: string }>("select perfis.apelido from ligas_membros join perfis on perfis.id = ligas_membros.usuario_id order by 1");
    expect(members.rows.map((row) => row.apelido)).toEqual(["Joao", "Miguel"]);
    expect((await db.query("select * from ligas_convites_email")).rows).toEqual([]);
    expect((await db.query<{ n: number }>("select count(*)::int as n from perfis")).rows[0].n).toBe(2);
  }, 60_000);

  it("não apaga nada se o grupo mantido não existir (bancos novos e testes)", async () => {
    const db = await createMigratedDatabase({ before: LIMPEZA });
    await seedUser(db, USER_A, "Miguel");
    await db.query("insert into ligas (nome, dono_id, codigo_convite, temporada) values ('teste', $1, 'ABCDEFGH', 2026)", [USER_A]);
    await applyMigration(db, LIMPEZA);
    expect((await db.query("select nome from ligas")).rows).toEqual([{ nome: "teste" }]);
  }, 60_000);
});
