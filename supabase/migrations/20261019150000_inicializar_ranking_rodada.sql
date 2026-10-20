-- Inicializa ranking_rodada para uma rodada quando ela abre
-- Cria entrada para todos os usuários que participam de ligas ativas
-- Posição inicial = 1, pontos = 0, posicao_anterior = null (primeira rodada não tem anterior)

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
    and exists (
      select 1 from public.rodadas r
      where r.id = p_rodada_id
        and r.temporada = l.temporada
        and r.simulada = (select valor::boolean from public.configuracoes where chave = 'rodada_simulada_atual' limit 1)
    )
  on conflict (rodada_id, usuario_id) do nothing;
end;
$$;

revoke all on function public.fn_inicializar_ranking_rodada(bigint) from public, anon, authenticated;
grant execute on function public.fn_inicializar_ranking_rodada(bigint) to service_role;