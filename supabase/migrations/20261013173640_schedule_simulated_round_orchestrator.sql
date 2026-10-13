-- Executa o avanço da simulação em intervalo curto, sem expor segredos ao cliente.
select cron.unschedule(jobid)
from cron.job
where jobname = 'avancar-rodada-simulada';

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'cron_project_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'cron_publishable_key') then
    raise exception 'Configure cron_project_url e cron_publishable_key no Supabase Vault antes de aplicar esta migration.';
  end if;
end;
$$;

select cron.schedule(
  'avancar-rodada-simulada',
  '*/2 * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_project_url') || '/functions/v1/advance-simulated-round',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key')
      ),
      body := '{}'::jsonb
    );
  $cron$
);
