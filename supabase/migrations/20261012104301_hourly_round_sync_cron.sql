create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

create table public.sync_execucoes (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('RODADA')),
  referencia text,
  iniciado_em timestamptz not null default now(),
  terminado_em timestamptz,
  requisicoes smallint not null default 0 check (requisicoes >= 0),
  cota_restante integer check (cota_restante >= 0),
  sucesso boolean not null,
  erro text,
  check ((sucesso and erro is null) or not sucesso)
);

create index sync_execucoes_tipo_iniciado_em_idx
  on public.sync_execucoes (tipo, iniciado_em desc);

alter table public.sync_execucoes enable row level security;

revoke all on public.sync_execucoes from anon, authenticated;
grant select, insert, update, delete on public.sync_execucoes to service_role;

select cron.unschedule(jobid)
from cron.job
where jobname = 'sincronizar-rodada-horaria';

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'cron_project_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'cron_publishable_key') then
    raise exception 'Configure os segredos cron_project_url e cron_publishable_key no Supabase Vault antes de aplicar esta migration.';
  end if;
end;
$$;

select cron.schedule(
  'sincronizar-rodada-horaria',
  '0 * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_project_url') || '/functions/v1/sync-round',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key')
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
  $cron$
);
