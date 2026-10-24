import type { PGlite } from "@electric-sql/pglite";

export const USER_A = "00000000-0000-4000-8000-00000000000a";
export const USER_B = "00000000-0000-4000-8000-00000000000b";

const FORMATION_433 = { GOL: 1, DEF: 4, MEI: 3, ATA: 3 } as const;

/** Catálogo mínimo: dois clubes e 6 jogadores por posição (ids 1–24), todos a C$ 5. */
export async function seedCatalog(db: PGlite) {
  await db.exec(`
    insert into clubes (id, nome, sigla) values (1, 'Clube A', 'CLA'), (2, 'Clube B', 'CLB');
    insert into jogadores (id, clube_id, nome, nome_exibicao, posicao, preco, preco_inicial)
    select n, 1 + (n % 2), 'Jogador ' || n, 'J' || n,
      (array['GOL','DEF','MEI','ATA'])[1 + (n - 1) / 6]::posicao, 5, 5
    from generate_series(1, 24) as n;
  `);
}

export async function seedUser(db: PGlite, id: string, apelido: string) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, `${apelido}@exemplo.test`]);
  await db.query(
    "insert into perfis (id, apelido, email, termos_versao, termos_aceitos_em) values ($1, $2, $3, 'v1', now())",
    [id, apelido, `${apelido}@exemplo.test`],
  );
}

/** Cria uma rodada e devolve o id. `travaEm` em intervalo SQL relativo a agora (ex.: '1 day'). */
export async function seedRound(db: PGlite, numero: number, status: string, travaEm: string, temporada = 2026): Promise<number> {
  const result = await db.query<{ id: number }>(
    `insert into rodadas (temporada, numero, status, trava_em, rotulo_api)
     values ($1, $2::smallint, $3::status_rodada, now() + $4::interval, 'Regular Season - ' || $2::smallint) returning id`,
    [temporada, numero, status, travaEm],
  );
  return Number(result.rows[0].id);
}

/** Ids de uma escalação 4-3-3 válida com o catálogo de `seedCatalog`. */
export function lineup433(): number[] {
  const firstIdByPosition = { GOL: 1, DEF: 7, MEI: 13, ATA: 19 } as const;
  return (Object.keys(FORMATION_433) as Array<keyof typeof FORMATION_433>).flatMap((position) =>
    Array.from({ length: FORMATION_433[position] }, (_, index) => firstIdByPosition[position] + index),
  );
}
