-- Escalação depois da trava (escalação tardia).
--
-- Quem não salvou o time até a trava ainda pode escalar enquanto menos da metade
-- dos jogos da rodada começou. Só entram jogadores de clubes cujo jogo ainda não
-- começou. Quem já tinha time salvo continua travado: a janela tardia só cria times.
--
-- Um jogo conta como iniciado quando está em andamento, encerrado ou quando o
-- horário de início já passou (o status vem da API e pode chegar com atraso).
-- O passe de quem escala depois da trava é consumido no próprio salvamento, porque
-- `fn_consumir_passes_rodada` já rodou na trava.

create or replace function public.fn_jogo_iniciado(p_status public.status_jogo, p_inicio_em timestamptz)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_status in ('EM_ANDAMENTO', 'ENCERRADO')
    or (p_status = 'A_JOGAR' and p_inicio_em <= now());
$$;

revoke all on function public.fn_jogo_iniciado(public.status_jogo, timestamptz) from public;
grant execute on function public.fn_jogo_iniciado(public.status_jogo, timestamptz) to anon, authenticated, service_role;

-- Janela tardia: rodada travada, ainda não fechada, com menos de 50% dos jogos iniciados.
create or replace function public.fn_escalacao_tardia_aberta(p_rodada_id bigint)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.rodadas rodada
    where rodada.id = p_rodada_id
      and rodada.status in ('ABERTA', 'EM_ANDAMENTO')
      and now() >= rodada.trava_em
      and (
        select count(*) > 0
          and count(*) filter (where public.fn_jogo_iniciado(jogo.status, coalesce(jogo.inicio_simulado_em, jogo.inicio_em))) * 2 < count(*)
        from public.jogos jogo
        where jogo.rodada_id = rodada.id
      )
  );
$$;

revoke all on function public.fn_escalacao_tardia_aberta(bigint) from public;
grant execute on function public.fn_escalacao_tardia_aberta(bigint) to anon, authenticated, service_role;

-- Um passe para o time salvo depois da trava, do lote que vence primeiro.
-- Mesmas isenções de `fn_consumir_passes_rodada` e o mesmo índice único contra débito em dobro.
create or replace function public.fn_consumir_passe_tardio(p_usuario_id uuid, p_rodada_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rodada public.rodadas%rowtype;
  v_lote_id bigint;
  v_movimentacao_id bigint;
begin
  select * into v_rodada from public.rodadas where id = p_rodada_id;
  if not found or v_rodada.simulada or not public.fn_passes_obrigatorios()
    or exists (select 1 from public.administradores adm where adm.usuario_id = p_usuario_id) then
    return;
  end if;

  select id into v_lote_id
  from public.passes_lotes
  where usuario_id = p_usuario_id
    and restantes > 0
    and valido_ate_temporada >= v_rodada.temporada
  order by valido_ate_temporada, id
  limit 1
  for update;

  if v_lote_id is null then
    raise exception using errcode = 'ES402', message = 'Você precisa de um passe para escalar nesta rodada.';
  end if;

  insert into public.passes_movimentacoes (usuario_id, lote_id, rodada_id, tipo, quantidade)
  values (p_usuario_id, v_lote_id, p_rodada_id, 'CONSUMO', 1)
  on conflict (usuario_id, rodada_id, tipo) where rodada_id is not null do nothing
  returning id into v_movimentacao_id;

  if v_movimentacao_id is not null then
    update public.passes_lotes set restantes = restantes - 1 where id = v_lote_id;
  end if;
end;
$$;

revoke all on function public.fn_consumir_passe_tardio(uuid, bigint) from public, anon, authenticated;

-- Definer: depois da trava as políticas de `times` e `times_jogadores` bloqueiam a escrita
-- direta, de propósito. Toda a validação está aqui e o dono do time é sempre `auth.uid()`.
create or replace function public.fn_salvar_escalacao(
  p_rodada_id bigint,
  p_formacao public.formacao,
  p_jogadores integer[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id uuid := auth.uid();
  v_tardia boolean := false;
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
    if not public.fn_escalacao_tardia_aberta(p_rodada_id) then
      raise exception using errcode = 'ES423', message = 'A janela de edição desta rodada já foi encerrada.';
    end if;
    if exists (select 1 from public.times where usuario_id = v_usuario_id and rodada_id = p_rodada_id) then
      raise exception using errcode = 'ES423', message = 'Seu time já está travado nesta rodada.';
    end if;
    v_tardia := true;
  end if;

  if not public.fn_passe_libera_rodada(p_rodada_id) then
    raise exception using errcode = 'ES402', message = 'Você precisa de um passe para escalar nesta rodada.';
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

  if v_tardia then
    select string_agg(coalesce(nullif(jogador.nome_exibicao, ''), jogador.nome), ', ' order by coalesce(nullif(jogador.nome_exibicao, ''), jogador.nome))
      into v_indisponiveis
    from public.jogadores jogador
    where jogador.id = any(v_jogadores)
      and exists (
        select 1
        from public.jogos jogo
        where jogo.rodada_id = p_rodada_id
          and jogador.clube_id in (jogo.clube_casa_id, jogo.clube_fora_id)
          and public.fn_jogo_iniciado(jogo.status, coalesce(jogo.inicio_simulado_em, jogo.inicio_em))
      );

    if v_indisponiveis is not null then
      raise exception using errcode = 'ES422', message = format('Troque os jogadores de times que já entraram em campo: %s.', v_indisponiveis);
    end if;
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

  if v_tardia then
    -- Sem `do update`: dois salvamentos simultâneos não podem sobrescrever o time já travado.
    insert into public.times (usuario_id, rodada_id, formacao, custo, salvo_em)
    values (v_usuario_id, p_rodada_id, p_formacao, v_custo, now())
    on conflict (usuario_id, rodada_id) do nothing
    returning id into v_time_id;

    if v_time_id is null then
      raise exception using errcode = 'ES423', message = 'Seu time já está travado nesta rodada.';
    end if;

    perform public.fn_consumir_passe_tardio(v_usuario_id, p_rodada_id);
  else
    insert into public.times (usuario_id, rodada_id, formacao, custo, salvo_em)
    values (v_usuario_id, p_rodada_id, p_formacao, v_custo, now())
    on conflict (usuario_id, rodada_id) do update
      set formacao = excluded.formacao,
          custo = excluded.custo,
          salvo_em = excluded.salvo_em
    returning id into v_time_id;

    delete from public.times_jogadores where time_id = v_time_id;
  end if;

  insert into public.times_jogadores (time_id, jogador_id, posicao, preco_pago)
  select v_time_id, id, posicao, preco
  from public.jogadores
  where id = any(v_jogadores);

  return v_time_id;
end;
$$;

revoke all on function public.fn_salvar_escalacao(bigint, public.formacao, integer[]) from public, anon;
grant execute on function public.fn_salvar_escalacao(bigint, public.formacao, integer[]) to authenticated;
