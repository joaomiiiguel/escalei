-- Lesionados e suspensos não podem ser escalados (JOA-164).
-- Mesma função de 20261024120000_orcamento_inicial_e_trava_escalacao.sql,
-- com a recusa de jogadores LESIONADO ou SUSPENSO (status sincronizado pela JOA-163).
-- Jogadores em DUVIDA continuam liberados.
create or replace function public.fn_salvar_escalacao(
  p_rodada_id bigint,
  p_formacao public.formacao,
  p_jogadores integer[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_jogadores integer[];
  v_esperado jsonb;
  v_total integer;
  v_gol integer;
  v_def integer;
  v_mei integer;
  v_ata integer;
  v_custo numeric(6,2);
  v_saldo numeric(8,2);
  v_time_id uuid;
  v_indisponiveis text;
begin
  if v_usuario_id is null then
    raise exception using errcode = 'ES401', message = 'Sua sessão expirou. Entre novamente para salvar.';
  end if;

  if not public.fn_rodada_editavel(p_rodada_id) then
    raise exception using errcode = 'ES423', message = 'A janela de edição desta rodada já foi encerrada.';
  end if;

  select array_agg(distinct jogador_id)
    into v_jogadores
  from unnest(coalesce(p_jogadores, '{}')) as jogador_id
  where jogador_id is not null;

  if coalesce(cardinality(v_jogadores), 0) <> 11 then
    raise exception using errcode = 'ES422', message = 'Selecione os 11 jogadores antes de salvar.';
  end if;

  select count(*),
         count(*) filter (where posicao = 'GOL'),
         count(*) filter (where posicao = 'DEF'),
         count(*) filter (where posicao = 'MEI'),
         count(*) filter (where posicao = 'ATA'),
         coalesce(sum(preco), 0)
    into v_total, v_gol, v_def, v_mei, v_ata, v_custo
  from public.jogadores
  where id = any(v_jogadores)
    and ativo;

  if v_total <> 11 then
    raise exception using errcode = 'ES422', message = 'Um ou mais jogadores não estão mais disponíveis.';
  end if;

  select string_agg(coalesce(nullif(nome_exibicao, ''), nome), ', ' order by coalesce(nullif(nome_exibicao, ''), nome))
    into v_indisponiveis
  from public.jogadores
  where id = any(v_jogadores)
    and status in ('LESIONADO', 'SUSPENSO');

  if v_indisponiveis is not null then
    raise exception using errcode = 'ES422', message = format('Troque os jogadores lesionados ou suspensos: %s.', v_indisponiveis);
  end if;

  v_esperado := case p_formacao
    when '4-3-3' then '{"GOL":1,"DEF":4,"MEI":3,"ATA":3}'::jsonb
    when '4-4-2' then '{"GOL":1,"DEF":4,"MEI":4,"ATA":2}'::jsonb
    when '3-5-2' then '{"GOL":1,"DEF":3,"MEI":5,"ATA":2}'::jsonb
  end;

  if v_gol <> (v_esperado ->> 'GOL')::integer
    or v_def <> (v_esperado ->> 'DEF')::integer
    or v_mei <> (v_esperado ->> 'MEI')::integer
    or v_ata <> (v_esperado ->> 'ATA')::integer then
    raise exception using errcode = 'ES422', message = 'Os jogadores não correspondem à formação escolhida.';
  end if;

  select saldo into v_saldo from public.carteiras where usuario_id = v_usuario_id;
  if v_saldo is null then
    raise exception using errcode = 'ES422', message = 'Não foi possível consultar seu saldo. Tente novamente.';
  end if;

  if v_custo > v_saldo then
    raise exception using errcode = 'ES422', message = 'A escalação ultrapassa o seu saldo disponível.';
  end if;

  insert into public.times (usuario_id, rodada_id, formacao, custo, salvo_em)
  values (v_usuario_id, p_rodada_id, p_formacao, v_custo, now())
  on conflict (usuario_id, rodada_id) do update
    set formacao = excluded.formacao,
        custo = excluded.custo,
        salvo_em = excluded.salvo_em
  returning id into v_time_id;

  delete from public.times_jogadores where time_id = v_time_id;

  insert into public.times_jogadores (time_id, jogador_id, posicao, preco_pago)
  select v_time_id, id, posicao, preco
  from public.jogadores
  where id = any(v_jogadores);

  return v_time_id;
end;
$$;

revoke all on function public.fn_salvar_escalacao(bigint, public.formacao, integer[]) from public, anon;
grant execute on function public.fn_salvar_escalacao(bigint, public.formacao, integer[]) to authenticated;
