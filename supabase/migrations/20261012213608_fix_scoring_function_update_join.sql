-- A tabela alvo do UPDATE fica apenas no WHERE, evitando dependência da
-- visibilidade do alias dentro de uma cláusula JOIN do FROM.
create or replace function public.fn_pontuar_jogo(p_jogo_id integer)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_rodada_id bigint;
  v_versao smallint;
begin
  select jogo.rodada_id, rodada.versao_regras
    into v_rodada_id, v_versao
  from public.jogos jogo
  join public.rodadas rodada on rodada.id = jogo.rodada_id
  where jogo.id = p_jogo_id;

  if v_rodada_id is null then
    raise exception 'Jogo % não encontrado', p_jogo_id;
  end if;

  update public.estatisticas_jogador estatistica
  set pontos = case
    when estatistica.minutos = 0 then 0
    else coalesce((
      select sum(regra.pontos * case regra.scout
        when 'gols' then estatistica.gols
        when 'assistencias' then estatistica.assistencias
        when 'finalizacoes_no_gol' then greatest(estatistica.finalizacoes_no_gol - estatistica.gols, 0)
        when 'finalizacoes_fora' then greatest(estatistica.finalizacoes - estatistica.finalizacoes_no_gol, 0)
        when 'desarmes' then estatistica.desarmes
        when 'faltas_sofridas' then estatistica.faltas_sofridas
        when 'penaltis_sofridos' then estatistica.penaltis_sofridos
        when 'defesas' then estatistica.defesas
        when 'penaltis_defendidos' then estatistica.penaltis_defendidos
        when 'sem_sofrer_gol' then case when estatistica.sem_sofrer_gol then 1 else 0 end
        when 'gols_sofridos' then estatistica.gols_sofridos
        when 'faltas_cometidas' then estatistica.faltas_cometidas
        when 'impedimentos' then estatistica.impedimentos
        when 'amarelos' then estatistica.amarelos
        when 'vermelhos' then estatistica.vermelhos
        when 'penaltis_perdidos' then estatistica.penaltis_perdidos
        when 'penaltis_cometidos' then estatistica.penaltis_cometidos
        when 'gols_contra' then estatistica.gols_contra
        else 0
      end)
      from public.tabela_pontuacao regra
      where regra.versao = v_versao
        and regra.posicao = jogador.posicao
    ), 0)
  end
  from public.jogadores jogador
  where estatistica.jogo_id = p_jogo_id
    and jogador.id = estatistica.jogador_id;

  update public.times_jogadores time_jogador
  set pontos = estatistica.pontos,
      pontuado = true
  from public.times time,
       public.estatisticas_jogador estatistica
  where estatistica.jogo_id = p_jogo_id
    and estatistica.jogador_id = time_jogador.jogador_id
    and time_jogador.time_id = time.id
    and time.rodada_id = v_rodada_id;

  update public.times time
  set pontos = coalesce((
        select sum(time_jogador.pontos)
        from public.times_jogadores time_jogador
        where time_jogador.time_id = time.id
      ), 0),
      gols_escalados = coalesce((
        select sum(estatistica.gols)
        from public.times_jogadores time_jogador
        join public.estatisticas_jogador estatistica
          on estatistica.rodada_id = v_rodada_id
         and estatistica.jogador_id = time_jogador.jogador_id
        where time_jogador.time_id = time.id
      ), 0)
  where time.rodada_id = v_rodada_id;

  insert into public.ranking_rodada (
    rodada_id, usuario_id, pontos, posicao, atualizado_apos_jogo_id
  )
  select v_rodada_id, time.usuario_id, time.pontos,
    rank() over (order by time.pontos desc, time.gols_escalados desc, time.custo asc, time.salvo_em asc)::integer,
    p_jogo_id
  from public.times time
  where time.rodada_id = v_rodada_id
  on conflict (rodada_id, usuario_id) do update
    set pontos = excluded.pontos,
        posicao_anterior = public.ranking_rodada.posicao,
        posicao = excluded.posicao,
        atualizado_apos_jogo_id = excluded.atualizado_apos_jogo_id,
        atualizado_em = now();

  update public.jogos set pontuado_em = now() where id = p_jogo_id;
end;
$$;

revoke all on function public.fn_pontuar_jogo(integer) from public, anon, authenticated;
grant execute on function public.fn_pontuar_jogo(integer) to service_role;
