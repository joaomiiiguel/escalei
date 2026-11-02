-- Avisos do ciclo da rodada para o admin enviar à mão no grupo do WhatsApp.
-- O banco enfileira a mensagem; `notify-whatsapp` avisa o admin por push e o envio é feito em /admin/avisos.
create table public.avisos_whatsapp (
  id bigint generated always as identity primary key,
  rodada_id bigint not null references public.rodadas(id) on delete cascade,
  tipo text not null check (tipo in ('MERCADO_ABERTO', 'FALTA_1H', 'MERCADO_FECHADO', 'RODADA_ENCERRADA')),
  mensagem text not null,
  criado_em timestamptz not null default now(),
  push_enviado_em timestamptz,
  enviado_em timestamptz,
  unique (rodada_id, tipo)
);

create index avisos_whatsapp_criado_em_idx on public.avisos_whatsapp (criado_em desc);

create table public.push_inscricoes (
  endpoint text primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  criado_em timestamptz not null default now()
);

-- Sem políticas: só a service_role acessa, sempre depois do requireAdmin.
alter table public.avisos_whatsapp enable row level security;
alter table public.push_inscricoes enable row level security;

revoke all on public.avisos_whatsapp, public.push_inscricoes from anon, authenticated;
grant select, insert, update, delete on public.avisos_whatsapp, public.push_inscricoes to service_role;

create function public.fn_texto_aviso_whatsapp(p_tipo text, p_numero smallint, p_trava_em timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case p_tipo
    when 'MERCADO_ABERTO' then format(
      E'🟢 Mercado aberto! A rodada %s do Escalou já começou a valer.\nEscale seu time até %s às %s.',
      p_numero,
      to_char(p_trava_em at time zone 'America/Sao_Paulo', 'DD/MM'),
      to_char(p_trava_em at time zone 'America/Sao_Paulo', 'HH24"h"MI')
    )
    when 'FALTA_1H' then format(
      E'⏰ Falta 1 hora! O mercado da rodada %s fecha às %s.\nAinda dá tempo de ajustar seu time.',
      p_numero,
      to_char(p_trava_em at time zone 'America/Sao_Paulo', 'HH24"h"MI')
    )
    when 'MERCADO_FECHADO' then format(
      E'🔒 Mercado fechado! As escalações da rodada %s estão travadas.\nAgora é acompanhar os jogos e os pontos.',
      p_numero
    )
    when 'RODADA_ENCERRADA' then format(
      E'🏁 Rodada %s encerrada! Pontos conferidos e ranking atualizado.\nVeja como ficou o seu grupo.',
      p_numero
    )
  end
$$;

-- Cobre todas as mudanças de status das rodadas reais, sem acoplar o aviso ao orquestrador.
create function public.fn_enfileirar_aviso_status_rodada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text := case new.status
    when 'ABERTA' then 'MERCADO_ABERTO'
    when 'EM_ANDAMENTO' then 'MERCADO_FECHADO'
    when 'FECHADA' then 'RODADA_ENCERRADA'
  end;
begin
  if v_tipo is null or new.simulada then
    return null;
  end if;

  insert into public.avisos_whatsapp (rodada_id, tipo, mensagem)
  values (new.id, v_tipo, public.fn_texto_aviso_whatsapp(v_tipo, new.numero, new.trava_em))
  on conflict (rodada_id, tipo) do nothing;
  return null;
end;
$$;

create trigger rodadas_enfileirar_aviso_status
after update of status on public.rodadas
for each row
when (old.status is distinct from new.status)
execute function public.fn_enfileirar_aviso_status_rodada();

-- Executada a cada 2 minutos por `notify-whatsapp`; devolve quantos avisos entraram na fila.
create function public.fn_enfileirar_aviso_fechamento()
returns integer
language sql
security definer
set search_path = ''
as $$
  with novos as (
    insert into public.avisos_whatsapp (rodada_id, tipo, mensagem)
    select rodada.id, 'FALTA_1H', public.fn_texto_aviso_whatsapp('FALTA_1H', rodada.numero, rodada.trava_em)
    from public.rodadas rodada
    where rodada.status = 'ABERTA'
      and not rodada.simulada
      and rodada.trava_em > now()
      and rodada.trava_em <= now() + interval '1 hour'
    on conflict (rodada_id, tipo) do nothing
    returning 1
  )
  select count(*)::integer from novos
$$;

revoke all on function public.fn_texto_aviso_whatsapp(text, smallint, timestamptz) from public, anon, authenticated;
revoke all on function public.fn_enfileirar_aviso_status_rodada() from public, anon, authenticated;
revoke all on function public.fn_enfileirar_aviso_fechamento() from public, anon, authenticated;
grant execute on function public.fn_enfileirar_aviso_fechamento() to service_role;

select cron.unschedule(job.jobid)
from cron.job job
where job.jobname = 'notificar-avisos-whatsapp';

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'cron_project_url')
    or not exists (select 1 from vault.decrypted_secrets where name = 'cron_publishable_key') then
    raise exception 'Configure cron_project_url e cron_publishable_key no Supabase Vault antes de aplicar esta migration.';
  end if;
end;
$$;

select cron.schedule(
  'notificar-avisos-whatsapp',
  '*/2 * * * *',
  $cron$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_project_url') || '/functions/v1/notify-whatsapp',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key'),
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_publishable_key')
      ),
      body := jsonb_build_object('source', 'pg_cron')
    );
  $cron$
);
