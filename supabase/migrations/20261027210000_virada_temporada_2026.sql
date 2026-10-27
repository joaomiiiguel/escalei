-- Virada para o Brasileirão 2026 real (JOA-147). Decisões de produto de 27/10/2026:
-- apagar os dados da simulação, saldo de todos em C$ 60,00, grupos na temporada
-- 2026 e estreia na rodada 33. ATENÇÃO: apaga dados de forma definitiva.

-- 1. Dados da simulação: rodadas simuladas e tudo que depende delas.
delete from public.movimentacoes_saldo where rodada_id in (select id from public.rodadas where simulada);
delete from public.historico_precos where rodada_id in (select id from public.rodadas where simulada);
delete from public.estatisticas_jogador where rodada_id in (select id from public.rodadas where simulada);
delete from public.ranking_rodada where rodada_id in (select id from public.rodadas where simulada);
-- times_jogadores sai em cascata com times.
delete from public.times where rodada_id in (select id from public.rodadas where simulada);
delete from public.jogos where rodada_id in (select id from public.rodadas where simulada);
delete from public.rodadas where simulada;

delete from public.configuracoes where chave = 'rodada_simulada_atual';

-- 2. Todos os saldos voltam para C$ 60,00, com movimentação auditável.
with ajustes as (
  insert into public.movimentacoes_saldo (usuario_id, rodada_id, time_id, tipo, valor, saldo_antes, saldo_depois)
  select carteira.usuario_id, null, null, 'AJUSTE_TEMPORADA_2026', 60.00 - carteira.saldo, carteira.saldo, 60.00
  from public.carteiras carteira
  on conflict do nothing
  returning usuario_id
)
update public.carteiras carteira
set saldo = 60.00,
    atualizado_em = now()
from ajustes ajuste
where carteira.usuario_id = ajuste.usuario_id;

-- 3. Grupos ativos passam a disputar a temporada 2026 (o grupo de teste de 2099 fica de fora).
update public.ligas
set temporada = 2026
where arquivada_em is null
  and temporada between 2024 and 2026;

-- 4. Temporada vigente.
insert into public.configuracoes (chave, valor)
values ('temporada_atual', '2026'::jsonb)
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();

-- 5. Agendamentos: sai a simulação, entram catálogo, calendário e orquestrador reais.
select cron.unschedule(job.jobid)
from cron.job job
where job.jobname in ('sincronizar-rodada-horaria', 'avancar-rodada-simulada', 'sincronizar-catalogo', 'sincronizar-calendario', 'avancar-rodada');

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'cron_project_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'cron_publishable_key') then
    raise exception 'Configure cron_project_url e cron_publishable_key no Supabase Vault antes de aplicar esta migration.';
  end if;
end;
$$;

-- Elencos e lesões mudam ao longo da semana; segunda-feira às 09:00 UTC.
select cron.schedule(
  'sincronizar-catalogo',
  '0 9 * * 1',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_project_url') || '/functions/v1/sync-catalog',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key')
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
  $cron$
);

-- Calendário oficial: 1 requisição a cada 6 horas.
select cron.schedule(
  'sincronizar-calendario',
  '15 */6 * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_project_url') || '/functions/v1/sync-calendar',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key')
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
  $cron$
);

-- Orquestrador: a cada 2 minutos; só consulta a API durante os jogos.
select cron.schedule(
  'avancar-rodada',
  '*/2 * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_project_url') || '/functions/v1/advance-round',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key')
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
  $cron$
);
