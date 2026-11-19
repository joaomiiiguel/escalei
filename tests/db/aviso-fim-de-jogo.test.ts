// @vitest-environment node
import { describe, expect, it } from "vitest";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A } from "./seed";

type Db = Awaited<ReturnType<typeof createMigratedDatabase>>;

async function createGame(db: Db, { jogoId = 1, simulada = false, status = "ENCERRADO" } = {}) {
  const { rows } = await db.query<{ id: number }>(
    "insert into rodadas (temporada, numero, status, trava_em, simulada, rotulo_api) values (2026, $1, 'EM_ANDAMENTO', now(), $2, $3) returning id",
    [jogoId, simulada, `Regular Season - ${jogoId}`],
  );
  await db.query(
    "insert into clubes (id, nome, sigla) values ($1, 'Casa', $3), ($2, 'Fora', $4)",
    [jogoId * 10, jogoId * 10 + 1, `CA${jogoId}`, `FO${jogoId}`],
  );
  await db.query(
    "insert into jogos (id, rodada_id, clube_casa_id, clube_fora_id, inicio_em, status, gols_casa, gols_fora) values ($1, $2, $3, $4, now(), $5, 2, 1)",
    [jogoId, rows[0].id, jogoId * 10, jogoId * 10 + 1, status],
  );
  return rows[0].id;
}

const queued = async (db: Db) => (await db.query<{ jogo_id: number }>("select jogo_id from avisos_jogo order by jogo_id")).rows.map((row) => row.jogo_id);

describe("aviso de fim de jogo", () => {
  it("enfileira uma vez, na primeira pontuação do jogo encerrado", async () => {
    const db = await createMigratedDatabase();
    const roundId = await createGame(db);

    await db.query("update jogos set gols_casa = 3 where id = 1");
    expect(await queued(db)).toEqual([]);

    await db.query("update jogos set pontuado_em = now() where id = 1");
    await db.query("update jogos set pontuado_em = now() + interval '1 hour', conferido_em = now() where id = 1");
    const { rows } = await db.query<{ jogo_id: number; rodada_id: number }>("select jogo_id, rodada_id from avisos_jogo");
    expect(rows).toEqual([{ jogo_id: 1, rodada_id: roundId }]);
  }, 60_000);

  it("ignora rodada simulada e jogo adiado ou cancelado", async () => {
    const db = await createMigratedDatabase();
    await createGame(db, { jogoId: 1, simulada: true });
    await createGame(db, { jogoId: 2, status: "ADIADO" });
    await createGame(db, { jogoId: 3, status: "CANCELADO" });
    await db.query("update jogos set pontuado_em = now()");
    expect(await queued(db)).toEqual([]);
  }, 60_000);

  it("não expõe a fila a usuários autenticados", async () => {
    const db = await createMigratedDatabase();
    await createGame(db);
    await db.query("update jogos set pontuado_em = now() where id = 1");
    await expect(asUser(db, USER_A, (tx) => tx.query("select * from avisos_jogo"))).rejects.toThrow(/permission denied/);
  }, 60_000);
});
