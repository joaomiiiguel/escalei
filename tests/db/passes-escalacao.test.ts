// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { applyMigration, asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, lineup433, seedCatalog, seedRound, seedUser } from "./seed";

const MIGRATION = "20261030160000_exigir_e_consumir_passes.sql";

let db: PGlite;
let roundNumber = 0;

/** Salva confirmando a transação: `asUser` desfaz tudo, e aqui o time precisa continuar lá para a trava. */
async function save(userId: string, roundId: number) {
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
    await tx.query("select fn_salvar_escalacao($1, '4-3-3'::formacao, $2)", [roundId, lineup433()]);
  });
}

const requirePasses = () => db.query("update configuracoes set valor = 'true' where chave = 'passes_obrigatorios'");
const openRound = (temporada = 2026) => seedRound(db, ++roundNumber, "ABERTA", "1 day", temporada);
const lockRound = (roundId: number) => db.query("update rodadas set trava_em = now() - interval '1 minute' where id = $1", [roundId]);

async function consume(roundId: number): Promise<number> {
  const result = await db.query<{ total: number }>("select fn_consumir_passes_rodada($1) as total", [roundId]);
  return result.rows[0].total;
}

async function refund(roundId: number): Promise<number> {
  const result = await db.query<{ total: number }>("select fn_estornar_passes_rodada($1) as total", [roundId]);
  return result.rows[0].total;
}

async function remaining(userId: string): Promise<number> {
  const result = await db.query<{ total: number }>("select coalesce(sum(restantes), 0)::int as total from passes_lotes where usuario_id = $1", [userId]);
  return result.rows[0].total;
}

async function clearPasses(userId: string) {
  await db.query("update passes_lotes set restantes = 0 where usuario_id = $1", [userId]);
}

async function seedLot(userId: string, restantes: number, validUntil: number): Promise<number> {
  const lot = await db.query<{ id: number }>(
    "insert into passes_lotes (usuario_id, origem, quantidade, restantes, valido_ate_temporada) values ($1, 'CORTESIA', $2, $2, $3) returning id",
    [userId, restantes, validUntil],
  );
  return Number(lot.rows[0].id);
}

async function seedGames(roundId: number, statuses: string[]) {
  for (const [index, status] of statuses.entries()) {
    await db.query(
      "insert into jogos (id, rodada_id, clube_casa_id, clube_fora_id, inicio_em, status) values ($1, $2, 1, 2, now(), $3::status_jogo)",
      [roundId * 100 + index, roundId, status],
    );
  }
}

describe("exigência e consumo do passe de rodada", () => {
  beforeEach(async () => {
    db = await createMigratedDatabase();
    await seedCatalog(db);
    await seedUser(db, USER_A, "usuario_a");
    await seedUser(db, USER_B, "usuario_b");
  }, 60_000);

  it("com a chave desligada, salva sem passe e não consome nada", async () => {
    await clearPasses(USER_A);
    await seedLot(USER_B, 1, 2027);
    const roundId = await openRound();
    await save(USER_A, roundId);
    await save(USER_B, roundId);
    await lockRound(roundId);

    expect(await consume(roundId)).toBe(0);
    expect(await remaining(USER_B)).toBe(3);
  }, 60_000);

  it("com a chave ligada, recusa salvar sem passe com o erro ES402", async () => {
    await requirePasses();
    await clearPasses(USER_A);
    const roundId = await openRound();

    await expect(save(USER_A, roundId)).rejects.toMatchObject({
      code: "ES402",
      message: "Você precisa de um passe para escalar nesta rodada.",
    });
    const teams = await db.query("select 1 from times where usuario_id = $1", [USER_A]);
    expect(teams.rows).toHaveLength(0);
  }, 60_000);

  it("não aceita passe vencido para a temporada da rodada", async () => {
    await requirePasses();
    await clearPasses(USER_A);
    await seedLot(USER_A, 3, 2025);
    await expect(save(USER_A, await openRound())).rejects.toMatchObject({ code: "ES402" });
  }, 60_000);

  it("salvar várias vezes gasta um passe só, e repetir a trava não debita de novo", async () => {
    await requirePasses();
    const roundId = await openRound();
    await save(USER_A, roundId);
    await save(USER_A, roundId);
    await save(USER_A, roundId);
    expect(await remaining(USER_A)).toBe(2);

    await lockRound(roundId);
    expect(await consume(roundId)).toBe(1);
    expect(await consume(roundId)).toBe(0);

    expect(await remaining(USER_A)).toBe(1);
    const moves = await db.query("select tipo, quantidade from passes_movimentacoes where usuario_id = $1 and rodada_id = $2", [USER_A, roundId]);
    expect(moves.rows).toEqual([{ tipo: "CONSUMO", quantidade: 1 }]);
  }, 60_000);

  it("não debita quem não salvou time", async () => {
    await requirePasses();
    const roundId = await openRound();
    await save(USER_A, roundId);
    await lockRound(roundId);
    await consume(roundId);
    expect(await remaining(USER_B)).toBe(2);
  }, 60_000);

  it("consome primeiro o lote que vence antes", async () => {
    await requirePasses();
    await clearPasses(USER_A);
    await seedLot(USER_A, 1, 2027);
    const expiringFirst = await seedLot(USER_A, 1, 2026);
    const roundId = await openRound();
    await save(USER_A, roundId);
    await lockRound(roundId);
    await consume(roundId);

    const consumed = await db.query<{ lote_id: string }>("select lote_id from passes_movimentacoes where tipo = 'CONSUMO' and usuario_id = $1", [USER_A]);
    expect(Number(consumed.rows[0].lote_id)).toBe(expiringFirst);
  }, 60_000);

  it("recusa consumir antes da trava", async () => {
    await requirePasses();
    await expect(consume(await openRound())).rejects.toThrow(/ainda não travou/);
  }, 60_000);

  it("mantém o time de quem ficou sem passe até a trava, sem débito", async () => {
    await requirePasses();
    const roundId = await openRound();
    await save(USER_A, roundId);
    await clearPasses(USER_A);
    await lockRound(roundId);

    expect(await consume(roundId)).toBe(0);
    const teams = await db.query("select 1 from times where usuario_id = $1 and rodada_id = $2", [USER_A, roundId]);
    expect(teams.rows).toHaveLength(1);
  }, 60_000);

  it("isenta administradores", async () => {
    await requirePasses();
    await clearPasses(USER_A);
    await db.query("insert into administradores (usuario_id, nome) values ($1, 'Admin')", [USER_A]);
    const roundId = await openRound();
    await save(USER_A, roundId);

    await seedLot(USER_A, 1, 2027);
    await lockRound(roundId);
    expect(await consume(roundId)).toBe(0);
    expect(await remaining(USER_A)).toBe(1);
  }, 60_000);

  it("não cobra passe em rodada simulada", async () => {
    await requirePasses();
    await clearPasses(USER_A);
    const roundId = await openRound();
    await db.query("update rodadas set simulada = true where id = $1", [roundId]);
    await save(USER_A, roundId);
    await lockRound(roundId);
    expect(await consume(roundId)).toBe(0);
  }, 60_000);

  it("estorna uma única vez quando todos os jogos da rodada foram adiados ou cancelados", async () => {
    await requirePasses();
    const roundId = await openRound();
    await seedGames(roundId, ["ADIADO", "CANCELADO"]);
    await save(USER_A, roundId);
    await lockRound(roundId);
    await consume(roundId);
    expect(await remaining(USER_A)).toBe(1);

    expect(await refund(roundId)).toBe(1);
    expect(await refund(roundId)).toBe(0);

    expect(await remaining(USER_A)).toBe(2);
    const moves = await db.query<{ tipo: string }>("select tipo from passes_movimentacoes where usuario_id = $1 and rodada_id = $2 order by id", [USER_A, roundId]);
    expect(moves.rows.map((move) => move.tipo)).toEqual(["CONSUMO", "ESTORNO"]);
  }, 60_000);

  it("não estorna se ao menos um jogo aconteceu ou se a rodada não tem jogos", async () => {
    await requirePasses();
    const partial = await openRound();
    await seedGames(partial, ["ENCERRADO", "CANCELADO"]);
    const empty = await openRound();
    await save(USER_A, partial);
    await lockRound(partial);
    await consume(partial);

    expect(await refund(partial)).toBe(0);
    expect(await refund(empty)).toBe(0);
    expect(await remaining(USER_A)).toBe(1);
  }, 60_000);

  it("expira na trava os lotes vencidos, registrando a quantidade perdida", async () => {
    await seedLot(USER_A, 3, 2025);
    const roundId = await seedRound(db, ++roundNumber, "ABERTA", "-1 minute");
    await consume(roundId);
    await consume(roundId);

    const expired = await db.query("select quantidade from passes_movimentacoes where usuario_id = $1 and tipo = 'EXPIRACAO'", [USER_A]);
    expect(expired.rows).toEqual([{ quantidade: 3 }]);
    expect(await remaining(USER_A)).toBe(2);
  }, 60_000);

  it("concede 2 passes válidos até a temporada seguinte ao criar o perfil, uma única vez", async () => {
    const lots = await db.query("select origem, quantidade, restantes, valido_ate_temporada from passes_lotes where usuario_id = $1", [USER_A]);
    expect(lots.rows).toEqual([{ origem: "CORTESIA", quantidade: 2, restantes: 2, valido_ate_temporada: 2027 }]);
    const credit = await db.query("select tipo, quantidade from passes_movimentacoes where usuario_id = $1", [USER_A]);
    expect(credit.rows).toEqual([{ tipo: "CREDITO", quantidade: 2 }]);

    // O onboarding faz upsert: refazê-lo não pode conceder de novo.
    await db.query(
      "insert into perfis (id, apelido, email, termos_versao, termos_aceitos_em) values ($1, 'usuario_a2', 'usuario_a@exemplo.test', 'v1', now()) on conflict (id) do update set apelido = excluded.apelido",
      [USER_A],
    );
    expect(await remaining(USER_A)).toBe(2);
  }, 60_000);

  it("concede a cortesia a quem já tinha conta antes da migration", async () => {
    const previous = await createMigratedDatabase({ before: MIGRATION });
    await seedUser(previous, USER_A, "usuario_a");
    await applyMigration(previous, MIGRATION);
    const lots = await previous.query("select restantes from passes_lotes where usuario_id = $1", [USER_A]);
    expect(lots.rows).toEqual([{ restantes: 2 }]);
  }, 60_000);

  it("não deixa o cliente consumir, estornar, expirar ou ganhar passes", async () => {
    const calls = [
      "select fn_consumir_passes_rodada(1)",
      "select fn_estornar_passes_rodada(1)",
      "select fn_expirar_passes()",
      `select fn_conceder_cortesia_passes('${USER_A}')`,
    ];
    for (const call of calls) {
      await expect(asUser(db, USER_A, (tx) => tx.query(call))).rejects.toThrow(/permission denied/);
    }
  }, 60_000);
});
