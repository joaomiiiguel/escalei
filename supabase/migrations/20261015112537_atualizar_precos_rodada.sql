create or replace function public.fn_atualizar_precos(p_rodada_id bigint)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_temporada smallint;
  v_numero smallint;
  v_proxima_rodada_id bigint;
begin
  perform pg_advisory_xact_lock(p_rodada_id);

  select temporada, numero
    into v_temporada, v_numero
  from public.rodadas
  where id = p_rodada_id;

  if v_temporada is null then
    raise exception 'Rodada % não encontrada', p_rodada_id;
  end if;

  if not exists (
    select 1
    from public.jogos
    where rodada_id = p_rodada_id
  ) then
    raise exception 'A rodada % não possui jogos', p_rodada_id;
  end if;

  if exists (
    select 1
    from public.jogos
    where rodada_id = p_rodada_id
      and pontuado_em is null
  ) then
    raise exception 'A rodada % possui jogos sem pontuação', p_rodada_id;
  end if;

  select id
    into v_proxima_rodada_id
  from public.rodadas
  where temporada = v_temporada
    and numero > v_numero
  order by numero
  limit 1;

  -- Não há mercado seguinte para receber o novo preço (por exemplo, na última rodada).
  if v_proxima_rodada_id is null then
    return;
  end if;

  -- A foto dos preços da próxima rodada torna uma reexecução segura.
  if exists (
    select 1
    from public.historico_precos
    where rodada_id = v_proxima_rodada_id
  ) then
    return;
  end if;

  with media_anterior as (
    select jogador_id, avg(pontos) as pontos_media
    from (
      select estatistica.jogador_id,
             estatistica.pontos,
             row_number() over (
               partition by estatistica.jogador_id
               order by rodada.numero desc, jogo.inicio_em desc, jogo.id desc
             ) as ordem
      from public.estatisticas_jogador estatistica
      join public.jogos jogo on jogo.id = estatistica.jogo_id
      join public.rodadas rodada on rodada.id = estatistica.rodada_id
      where rodada.temporada = v_temporada
        and rodada.numero < v_numero
        and estatistica.minutos > 0
    ) ultimos_jogos
    where ordem <= 5
    group by jogador_id
  ), pontos_da_rodada as (
    select jogador_id, sum(pontos) as pontos
    from public.estatisticas_jogador
    where rodada_id = p_rodada_id
    group by jogador_id
  ), precos_calculados as (
    select jogador.id as jogador_id,
           round(
             least(
               20::numeric,
               greatest(
                 2::numeric,
                 jogador.preco + least(
                   2::numeric,
                   greatest(
                     -2::numeric,
                     round(0.25 * (coalesce(pontos_da_rodada.pontos, 0) - coalesce(media_anterior.pontos_media, 0)), 2)
                   )
                 )
               )
             ),
             2
           ) as preco
    from public.jogadores jogador
    left join pontos_da_rodada on pontos_da_rodada.jogador_id = jogador.id
    left join media_anterior on media_anterior.jogador_id = jogador.id
    where jogador.ativo
  )
  insert into public.historico_precos (jogador_id, rodada_id, preco, variacao)
  select jogador_id,
         v_proxima_rodada_id,
         preco,
         round(preco - jogador.preco, 2)
  from precos_calculados
  join public.jogadores jogador on jogador.id = precos_calculados.jogador_id;

  update public.jogadores jogador
  set preco = historico.preco
  from public.historico_precos historico
  where historico.jogador_id = jogador.id
    and historico.rodada_id = v_proxima_rodada_id;
end;
$$;

revoke all on function public.fn_atualizar_precos(bigint) from public, anon, authenticated;
grant execute on function public.fn_atualizar_precos(bigint) to service_role;
