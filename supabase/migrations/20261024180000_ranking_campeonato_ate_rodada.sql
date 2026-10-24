-- Ranking do campeonato até uma rodada (p_ate_numero), para comparar a posição
-- atual com a posição ao fim da rodada anterior e indicar quem subiu ou desceu.
-- A assinatura muda; a versão de 3 parâmetros sai para não gerar chamada ambígua.
drop function if exists public.fn_ranking_campeonato(uuid, smallint, boolean);

create or replace function public.fn_ranking_campeonato(
  p_liga_id uuid,
  p_temporada smallint,
  p_simulada boolean default false,
  p_ate_numero smallint default null
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
      and (p_ate_numero is null or rodada.numero <= p_ate_numero)
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

revoke all on function public.fn_ranking_campeonato(uuid, smallint, boolean, smallint) from public, anon;
grant execute on function public.fn_ranking_campeonato(uuid, smallint, boolean, smallint) to authenticated, service_role;
