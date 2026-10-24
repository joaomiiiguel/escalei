-- Administradores entram em ligas_membros ao criar um grupo, mas não disputam:
-- ficam fora do ranking da rodada, do ranking do campeonato e da inicialização.

delete from public.ranking_rodada ranking
where exists (select 1 from public.administradores adm where adm.usuario_id = ranking.usuario_id);

create or replace function public.fn_inicializar_ranking_rodada(
  p_rodada_id bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rodada record;
  v_is_first_round boolean;
begin
  -- Verificar se a rodada existe
  select * into v_rodada from public.rodadas where id = p_rodada_id;
  if not found then
    raise exception 'Rodada % não encontrada', p_rodada_id;
  end if;

  -- Verificar se é a primeira rodada da temporada (não há rodada anterior)
  select exists (
    select 1 from public.rodadas
    where temporada = v_rodada.temporada
      and simulada = v_rodada.simulada
      and numero < v_rodada.numero
  ) into v_is_first_round;

  -- Inserir ranking inicial para todos os usuários que têm times salvos nesta rodada
  insert into public.ranking_rodada (
    rodada_id,
    usuario_id,
    pontos,
    posicao,
    posicao_anterior,
    atualizado_apos_jogo_id,
    atualizado_em
  )
  select
    p_rodada_id,
    t.usuario_id,
    0 as pontos,
    1 as posicao,
    case when v_is_first_round then null else 1 end as posicao_anterior,
    null::integer as atualizado_apos_jogo_id,
    now() as atualizado_em
  from public.times t
  where t.rodada_id = p_rodada_id
    and not exists (select 1 from public.administradores adm where adm.usuario_id = t.usuario_id)
  on conflict (rodada_id, usuario_id) do nothing;

  -- Também inicializar para membros de ligas ativas que ainda não têm time
  insert into public.ranking_rodada (
    rodada_id,
    usuario_id,
    pontos,
    posicao,
    posicao_anterior,
    atualizado_apos_jogo_id,
    atualizado_em
  )
  select distinct
    p_rodada_id,
    lm.usuario_id,
    0 as pontos,
    1 as posicao,
    case when v_is_first_round then null else 1 end as posicao_anterior,
    null::integer as atualizado_apos_jogo_id,
    now() as atualizado_em
  from public.ligas_membros lm
  join public.ligas l on l.id = lm.liga_id
  where l.arquivada_em is null
    and l.temporada = v_rodada.temporada
    and not exists (select 1 from public.administradores adm where adm.usuario_id = lm.usuario_id)
  on conflict (rodada_id, usuario_id) do nothing;
end;
$$;

revoke all on function public.fn_inicializar_ranking_rodada(bigint) from public, anon, authenticated;
grant execute on function public.fn_inicializar_ranking_rodada(bigint) to service_role;

-- Ranking do campeonato do grupo, sem administradores.
create or replace function public.fn_ranking_campeonato(
  p_liga_id uuid,
  p_temporada smallint,
  p_simulada boolean default false
)
returns table (
  usuario_id uuid,
  apelido text,
  clube_sigla text,
  pontos numeric(9,2),
  rodadas_disputadas integer,
  gols_escalados integer,
  posicao integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.ligas_membros membro
    join public.ligas liga on liga.id = membro.liga_id
    where membro.liga_id = p_liga_id
      and membro.usuario_id = auth.uid()
      and liga.arquivada_em is null
  ) then
    raise exception using errcode = 'ES403', message = 'Você não participa deste grupo.';
  end if;

  return query
  with rodadas_campeonato as (
    select rodada.id
    from public.rodadas rodada
    where rodada.temporada = p_temporada
      and rodada.simulada = p_simulada
      and rodada.status in ('EM_ANDAMENTO', 'FECHADA')
  ), totais as (
    select membro.usuario_id,
           coalesce(sum(time.pontos), 0)::numeric(9,2) as pontos,
           count(time.id)::integer as rodadas_disputadas,
           coalesce(sum(time.gols_escalados), 0)::integer as gols_escalados
    from public.ligas_membros membro
    left join public.times time
      on time.usuario_id = membro.usuario_id
     and time.rodada_id in (select id from rodadas_campeonato)
    where membro.liga_id = p_liga_id
      and not exists (select 1 from public.administradores adm where adm.usuario_id = membro.usuario_id)
    group by membro.usuario_id
  )
  select total.usuario_id,
         perfil.apelido::text,
         clube.sigla::text,
         total.pontos,
         total.rodadas_disputadas,
         total.gols_escalados,
         rank() over (order by total.pontos desc, total.gols_escalados desc)::integer as posicao
  from totais total
  join public.perfis perfil on perfil.id = total.usuario_id
  left join public.clubes clube on clube.id = perfil.clube_coracao_id
  order by posicao, perfil.apelido;
end;
$$;

revoke all on function public.fn_ranking_campeonato(uuid, smallint, boolean) from public, anon;
grant execute on function public.fn_ranking_campeonato(uuid, smallint, boolean) to authenticated, service_role;
