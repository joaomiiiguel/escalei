-- RPC para buscar ranking de uma rodada (liga ou geral)
-- Retorna ranking calculado com desempate oficial: pontos desc, gols_escalados desc, custo asc, salvo_em asc

create or replace function public.fn_ranking_rodada(
  p_rodada_id bigint,
  p_usuario_ids uuid[] default null
)
returns table (
  usuario_id uuid,
  apelido text,
  clube_sigla text,
  pontos numeric(7,2),
  posicao integer,
  posicao_anterior integer,
  gols_escalados integer,
  custo numeric(6,2),
  salvo_em timestamptz,
  atualizado_em timestamptz,
  is_current_user boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with ranking_base as (
    select
      t.usuario_id,
      p.apelido,
      c.sigla as clube_sigla,
      t.pontos,
      t.gols_escalados,
      t.custo,
      t.salvo_em,
      rr.posicao,
      rr.posicao_anterior,
      rr.atualizado_em,
      (p.id = auth.uid()) as is_current_user
    from public.times t
    join public.perfis p on p.id = t.usuario_id
    left join public.clubes c on c.id = p.clube_coracao_id
    left join public.ranking_rodada rr on rr.rodada_id = t.rodada_id and rr.usuario_id = t.usuario_id
    where t.rodada_id = p_rodada_id
      and (p_usuario_ids is null or t.usuario_id = any(p_usuario_ids))
  )
  select
    rb.usuario_id,
    rb.apelido,
    rb.clube_sigla,
    rb.pontos,
    rank() over (
      order by rb.pontos desc, rb.gols_escalados desc, rb.custo asc, rb.salvo_em asc
    )::integer as posicao,
    rb.posicao_anterior,
    rb.gols_escalados,
    rb.custo,
    rb.salvo_em,
    rb.atualizado_em,
    rb.is_current_user
  from ranking_base rb
  order by posicao, rb.usuario_id;
end;
$$;

revoke all on function public.fn_ranking_rodada(bigint, uuid[]) from public, anon, authenticated;
grant execute on function public.fn_ranking_rodada(bigint, uuid[]) to service_role;
grant execute on function public.fn_ranking_rodada(bigint, uuid[]) to authenticated;