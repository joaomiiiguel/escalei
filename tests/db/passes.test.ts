// @vitest-environment node
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A, USER_B, seedRound, seedUser } from "./seed";

const NEW_ORDER = "insert into pedidos (usuario_id, produto_id, valor_centavos) select $1, id, preco_centavos from produtos_passe where codigo = 'AVULSO' returning id";

async function seedLot(db: PGlite, userId: string, remaining: number, validUntil = 2027): Promise<number> {
  const lot = await db.query<{ id: number }>(
    "insert into passes_lotes (usuario_id, origem, quantidade, restantes, valido_ate_temporada) values ($1, 'CORTESIA', 5, $2, $3) returning id",
    [userId, remaining, validUntil],
  );
  return Number(lot.rows[0].id);
}

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

describe("passes de rodada", () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createMigratedDatabase();
    await seedUser(db, USER_A, "usuario_a");
    await seedUser(db, USER_B, "usuario_b");
  }, 60_000);

  it("publica o catálogo com os preços em centavos", async () => {
    const products = await db.query("select codigo, quantidade, preco_centavos from produtos_passe order by preco_centavos");
    expect(products.rows).toEqual([
      { codigo: "AVULSO", quantidade: 1, preco_centavos: 499 },
      { codigo: "PACOTE_5", quantidade: 5, preco_centavos: 1999 },
    ]);
    const visible = await db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      const rows = await tx.query("select id from produtos_passe");
      await tx.rollback();
      return rows.rows;
    });
    expect(visible).toHaveLength(2);
  });

  it("mostra a cada usuário só os próprios pedidos, lotes e movimentações", async () => {
    const order = await db.query(NEW_ORDER, [USER_A]);
    const lot = await seedLot(db, USER_A, 5);
    await db.query("insert into passes_movimentacoes (usuario_id, lote_id, tipo, quantidade) values ($1, $2, 'CREDITO', 5)", [USER_A, lot]);

    for (const table of ["pedidos", "passes_lotes", "passes_movimentacoes"]) {
      const own = await asUser(db, USER_A, (tx) => tx.query(`select 1 from ${table}`));
      const other = await asUser(db, USER_B, (tx) => tx.query(`select 1 from ${table}`));
      expect(own.rows.length).toBeGreaterThan(0);
      expect(other.rows).toHaveLength(0);
    }
    expect(order.rows).toHaveLength(1);
  });

  it("não aceita escrita pelo cliente", async () => {
    const attempts = [
      "insert into pedidos (usuario_id, produto_id, valor_centavos) values (auth.uid(), 1, 1)",
      "update pedidos set status = 'PAGO', pago_em = now()",
      "insert into passes_lotes (usuario_id, origem, quantidade, restantes, valido_ate_temporada) values (auth.uid(), 'CORTESIA', 99, 99, 2027)",
      "update passes_lotes set restantes = 5",
      "delete from passes_movimentacoes",
      "update produtos_passe set preco_centavos = 1",
    ];
    for (const attempt of attempts) {
      await expect(asUser(db, USER_A, (tx) => tx.exec(attempt))).rejects.toThrow(/permission denied/);
    }
  });

  it("mantém o livro somente de inserção até para o servidor", async () => {
    await expect(asServiceRole(db, (tx) => tx.exec("update passes_movimentacoes set quantidade = 9"))).rejects.toThrow(/permission denied/);
    await expect(asServiceRole(db, (tx) => tx.exec("delete from passes_movimentacoes"))).rejects.toThrow(/permission denied/);
  });

  it("gera no máximo um lote por pedido", async () => {
    const order = await db.query<{ id: string }>(NEW_ORDER, [USER_B]);
    const insertLot = "insert into passes_lotes (usuario_id, pedido_id, origem, quantidade, restantes, valido_ate_temporada) values ($1, $2, 'COMPRA', 1, 1, 2027)";
    await db.query(insertLot, [USER_B, order.rows[0].id]);
    await expect(db.query(insertLot, [USER_B, order.rows[0].id])).rejects.toThrow(/passes_lotes_pedido_id_key/);
  });

  it("registra um único consumo por usuário e rodada", async () => {
    const lot = await seedLot(db, USER_A, 5);
    const roundId = await seedRound(db, 30, "ABERTA", "1 day");
    const consume = "insert into passes_movimentacoes (usuario_id, lote_id, rodada_id, tipo, quantidade) values ($1, $2, $3, 'CONSUMO', 1)";
    await db.query(consume, [USER_A, lot, roundId]);
    await expect(db.query(consume, [USER_A, lot, roundId])).rejects.toThrow(/passes_movimentacoes_rodada_unica/);
  });

  it("recusa movimentação em lote de outro usuário e consumo sem rodada", async () => {
    const lot = await seedLot(db, USER_A, 5);
    await expect(db.query("insert into passes_movimentacoes (usuario_id, lote_id, tipo, quantidade) values ($1, $2, 'CREDITO', 1)", [USER_B, lot]))
      .rejects.toThrow(/foreign key/);
    await expect(db.query("insert into passes_movimentacoes (usuario_id, lote_id, tipo, quantidade) values ($1, $2, 'CONSUMO', 1)", [USER_A, lot]))
      .rejects.toThrow(/passes_movimentacoes_rodada_coerente/);
  });

  it("valida os limites dos lotes e dos pedidos", async () => {
    await expect(seedLot(db, USER_A, 6)).rejects.toThrow(/passes_lotes_restantes_validos/);
    await expect(seedLot(db, USER_A, -1)).rejects.toThrow(/passes_lotes_restantes_validos/);
    await expect(db.query("insert into passes_lotes (usuario_id, origem, quantidade, restantes, valido_ate_temporada) values ($1, 'COMPRA', 1, 1, 2027)", [USER_A]))
      .rejects.toThrow(/passes_lotes_compra_com_pedido/);
    const order = await db.query<{ id: string }>(NEW_ORDER, [USER_A]);
    await expect(db.query("update pedidos set status = 'PAGO' where id = $1", [order.rows[0].id])).rejects.toThrow(/pedidos_pago_com_data/);
    await expect(db.query("update pedidos set nota_emitida_em = now() where id = $1", [order.rows[0].id])).rejects.toThrow(/pedidos_nota_so_apos_pagamento/);
  });

  it("soma só os passes do usuário ainda válidos na temporada atual", async () => {
    const user = "00000000-0000-4000-8000-00000000000c";
    await seedUser(db, user, "usuario_c");
    expect(await available(db, user)).toBe(0);
    await seedLot(db, user, 2, 2026);
    await seedLot(db, user, 3, 2027);
    await seedLot(db, user, 4, 2025);
    await seedLot(db, USER_B, 5, 2027);
    expect(await available(db, user)).toBe(5);
  });

  it("não expõe a função de saldo a visitantes", async () => {
    await expect(db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      await tx.query("select fn_passes_disponiveis()");
    })).rejects.toThrow(/permission denied/);
  });

  it("preserva o pedido e apaga os passes quando a conta é excluída", async () => {
    const user = "00000000-0000-4000-8000-00000000000d";
    await seedUser(db, user, "usuario_d");
    const order = await db.query<{ id: string }>(NEW_ORDER, [user]);
    const lot = await db.query<{ id: number }>(
      "insert into passes_lotes (usuario_id, pedido_id, origem, quantidade, restantes, valido_ate_temporada) values ($1, $2, 'COMPRA', 1, 1, 2027) returning id",
      [user, order.rows[0].id],
    );
    await db.query("insert into passes_movimentacoes (usuario_id, lote_id, tipo, quantidade) values ($1, $2, 'CREDITO', 1)", [user, lot.rows[0].id]);

    await db.query("delete from perfis where id = $1", [user]);

    const kept = await db.query("select usuario_id from pedidos where id = $1", [order.rows[0].id]);
    expect(kept.rows).toEqual([{ usuario_id: null }]);
    const lots = await db.query("select 1 from passes_lotes where usuario_id = $1", [user]);
    expect(lots.rows).toHaveLength(0);
  });
});

async function available(db: PGlite, userId: string): Promise<number> {
  const result = await asUser(db, userId, (tx) => tx.query<{ total: number }>("select fn_passes_disponiveis() as total"));
  return result.rows[0].total;
}
