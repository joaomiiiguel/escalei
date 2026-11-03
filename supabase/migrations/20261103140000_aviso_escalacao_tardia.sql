-- Aviso para quem não escalou: depois da trava, enquanto a escalação tardia estiver aberta.
-- O push vai só para quem não tem time na rodada (`publico = 'SEM_TIME'`). O "mercado fechado"
-- passa a ir só para quem escalou, para ninguém receber "já era" e "ainda dá tempo" juntos.

alter table public.avisos_whatsapp drop constraint avisos_whatsapp_tipo_check;
alter table public.avisos_whatsapp add constraint avisos_whatsapp_tipo_check
  check (tipo in ('MERCADO_ABERTO', 'FALTA_1H', 'MERCADO_FECHADO', 'ESCALACAO_TARDIA', 'RODADA_ENCERRADA'));

alter table public.avisos_whatsapp
  add column publico text not null default 'TODOS' check (publico in ('TODOS', 'COM_TIME', 'SEM_TIME'));

comment on column public.avisos_whatsapp.publico is
  'Quem recebe o push: todos os inscritos, só quem tem time na rodada ou só quem não tem.';

-- Horário previsto para a escalação tardia fechar: o início do jogo que completa metade da rodada.
create function public.fn_limite_escalacao_tardia(p_rodada_id bigint)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select inicio
  from (
    select coalesce(jogo.inicio_simulado_em, jogo.inicio_em) as inicio,
      row_number() over (order by coalesce(jogo.inicio_simulado_em, jogo.inicio_em), jogo.id) as ordem,
      count(*) over () as total
    from public.jogos jogo
    where jogo.rodada_id = p_rodada_id
  ) jogos
  where ordem = ceil(total / 2.0)
$$;

revoke all on function public.fn_limite_escalacao_tardia(bigint) from public, anon, authenticated;

create function public.fn_texto_aviso_escalacao_tardia(p_numero smallint, p_limite timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select format(
    E'⚽ Ainda dá tempo, esquecido! A rodada %s travou, mas você pode escalar até %s às %s.\nSó vale jogador de time que ainda não entrou em campo.',
    p_numero,
    to_char(p_limite at time zone 'America/Sao_Paulo', 'DD/MM'),
    to_char(p_limite at time zone 'America/Sao_Paulo', 'HH24"h"MI')
  )
$$;

revoke all on function public.fn_texto_aviso_escalacao_tardia(smallint, timestamptz) from public, anon, authenticated;

create or replace function public.fn_enfileirar_aviso_status_rodada()
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

  insert into public.avisos_whatsapp (rodada_id, tipo, mensagem, publico)
  values (
    new.id,
    v_tipo,
    public.fn_texto_aviso_whatsapp(v_tipo, new.numero, new.trava_em),
    case when v_tipo = 'MERCADO_FECHADO' then 'COM_TIME' else 'TODOS' end
  )
  on conflict (rodada_id, tipo) do nothing;
  return null;
end;
$$;

-- Executada a cada 2 minutos por `notify-whatsapp`; devolve quantos avisos entraram na fila.
create or replace function public.fn_enfileirar_aviso_fechamento()
returns integer
language sql
security definer
set search_path = ''
as $$
  with falta_1h as (
    insert into public.avisos_whatsapp (rodada_id, tipo, mensagem)
    select rodada.id, 'FALTA_1H', public.fn_texto_aviso_whatsapp('FALTA_1H', rodada.numero, rodada.trava_em)
    from public.rodadas rodada
    where rodada.status = 'ABERTA'
      and not rodada.simulada
      and rodada.trava_em > now()
      and rodada.trava_em <= now() + interval '1 hour'
    on conflict (rodada_id, tipo) do nothing
    returning 1
  ), escalacao_tardia as (
    insert into public.avisos_whatsapp (rodada_id, tipo, mensagem, publico)
    select rodada.id, 'ESCALACAO_TARDIA',
      public.fn_texto_aviso_escalacao_tardia(rodada.numero, public.fn_limite_escalacao_tardia(rodada.id)),
      'SEM_TIME'
    from public.rodadas rodada
    where not rodada.simulada
      and public.fn_escalacao_tardia_aberta(rodada.id)
      and public.fn_limite_escalacao_tardia(rodada.id) > now()
    on conflict (rodada_id, tipo) do nothing
    returning 1
  )
  select ((select count(*) from falta_1h) + (select count(*) from escalacao_tardia))::integer
$$;

revoke all on function public.fn_enfileirar_aviso_status_rodada() from public, anon, authenticated;
revoke all on function public.fn_enfileirar_aviso_fechamento() from public, anon, authenticated;
grant execute on function public.fn_enfileirar_aviso_fechamento() to service_role;
