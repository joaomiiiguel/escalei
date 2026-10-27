import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { citext } from "@electric-sql/pglite/contrib/citext";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../supabase/migrations");

/** Extensões exclusivas da plataforma Supabase; são substituídas pelos stubs abaixo. */
const PLATFORM_EXTENSIONS = /create extension if not exists (pg_cron|pg_net|supabase_vault);/gi;

/**
 * Simula o mínimo do ambiente Supabase: papéis, `auth.uid()` lido de
 * `request.jwt.claim.sub` (como faz o PostgREST) e stubs de pg_cron, pg_net e Vault.
 */
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema cron;
  create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text, active boolean not null default true);
  create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as $$
    insert into cron.job (jobname, schedule, command) values (p_name, p_schedule, p_command) returning jobid
  $$;
  create function cron.unschedule(p_jobid bigint) returns boolean language sql as $$
    delete from cron.job where jobid = p_jobid returning true
  $$;
  create function cron.alter_job(job_id bigint, schedule text default null, command text default null, database text default null, username text default null, active boolean default null) returns void language sql as $$
    update cron.job set schedule = coalesce(alter_job.schedule, job.schedule), command = coalesce(alter_job.command, job.command), active = coalesce(alter_job.active, job.active) where job.jobid = job_id
  $$;
  create schema vault;
  create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
  insert into vault.decrypted_secrets values ('cron_project_url', 'http://localhost'), ('cron_publishable_key', 'teste');
`;

/** Cria um Postgres em memória com todas as migrations do projeto aplicadas em ordem. */
export async function createMigratedDatabase(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { citext, pgcrypto } });
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8").replace(PLATFORM_EXTENSIONS, "");
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Falha ao aplicar ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return db;
}

/** Executa `fn` como um usuário autenticado (RLS ativa) e desfaz tudo ao final. */
export async function asUser<T>(db: PGlite, userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  let result: T | undefined;
  let failure: unknown;
  await db.transaction(async (tx) => {
    await tx.exec("set local role authenticated");
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
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
