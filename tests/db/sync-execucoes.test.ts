// @vitest-environment node
import { describe, expect, it } from "vitest";
import { asUser, createMigratedDatabase } from "./supabase-pglite";
import { USER_A } from "./seed";

describe("sync_execucoes", () => {
  it("aceita execuções de todas as funções que chamam a API-Football e fica fora do alcance dos usuários", async () => {
    const db = await createMigratedDatabase();
    for (const tipo of ["RODADA", "JOGO", "PONTUACAO", "ORQUESTRADOR", "CATALOGO", "CALENDARIO"]) {
      await db.query("insert into sync_execucoes (tipo, requisicoes, cota_restante, sucesso) values ($1, 2, 80, true)", [tipo]);
    }
    await expect(db.query("insert into sync_execucoes (tipo, sucesso) values ('OUTRO', true)")).rejects.toThrow(/sync_execucoes_tipo_check/);
    await expect(asUser(db, USER_A, (tx) => tx.query("select * from sync_execucoes"))).rejects.toThrow(/permission denied/);
  }, 60_000);
});

describe("controle de consumo da API-Football", () => {
  it("soma as requisições do dia e guarda o orçamento em configuracoes", async () => {
    const db = await createMigratedDatabase();
    await db.query("insert into sync_execucoes (tipo, requisicoes, sucesso, iniciado_em) values ('PONTUACAO', 2, false, '2026-10-26T23:59:00Z'), ('PONTUACAO', 2, false, '2026-10-27T00:01:00Z'), ('RODADA', 1, true, '2026-10-27T10:00:00Z')");
    const used = await db.query<{ total: number }>("select fn_requisicoes_api_football('2026-10-27T00:00:00Z') as total");
    expect(used.rows[0].total).toBe(3);
    const config = await db.query<{ chave: string; valor: number }>("select chave, valor from configuracoes where chave like 'api_football_%' or chave = 'reserva_cota_api' order by chave");
    expect(config.rows).toEqual([
      { chave: "api_football_limite_diario", valor: 7500 },
      { chave: "api_football_max_tentativas_pontuacao", valor: 10 },
      { chave: "api_football_reserva_diaria", valor: 500 },
    ]);
    const columns = await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_name = 'jogos' and column_name like 'pontuacao_%' order by 1");
    expect(columns.rows.map((row) => row.column_name)).toEqual(["pontuacao_proxima_tentativa_em", "pontuacao_tentativas", "pontuacao_ultimo_erro"]);
  }, 60_000);

  it("não deixa usuários consultarem o consumo", async () => {
    const db = await createMigratedDatabase();
    await expect(asUser(db, USER_A, (tx) => tx.query("select fn_requisicoes_api_football(now())"))).rejects.toThrow(/permission denied/);
  }, 60_000);
});

describe("crons da simulação", () => {
  it("ficam pausados (inativos, não removidos) para a migração ao Brasileirão 2026", async () => {
    const db = await createMigratedDatabase({ before: "20261027210000_virada_temporada_2026.sql" });
    const jobs = await db.query<{ jobname: string; active: boolean }>("select jobname, active from cron.job order by jobname");
    expect(jobs.rows).toEqual([
      { jobname: "avancar-rodada-simulada", active: false },
      { jobname: "sincronizar-rodada-horaria", active: false },
    ]);
  }, 60_000);
});
