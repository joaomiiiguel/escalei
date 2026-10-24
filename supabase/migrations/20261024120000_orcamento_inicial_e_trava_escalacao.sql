-- Saldo inicial de C$ 60,00. O saldo cresce a cada rodada fechada:
-- cada jogador rende max(pontos − preço pago, 0) (fn_creditar_saldos_rodada).
alter table public.carteiras alter column saldo set default 60.00;

-- Carteiras que ainda não receberam rendimento recebem o novo saldo inicial.
update public.carteiras carteira
set saldo = 60.00,
    atualizado_em = now()
where carteira.saldo = 50.00
  and not exists (
    select 1
    from public.movimentacoes_saldo movimentacao
    where movimentacao.usuario_id = carteira.usuario_id
  );

-- O limite do custo é o saldo do usuário, que pode passar de C$ 100.
alter table public.times drop constraint if exists times_custo_check;
alter table public.times add constraint times_custo_check check (custo >= 0);

-- Uma rodada aceita escalações apenas enquanto está ABERTA e antes da trava.
create or replace function public.fn_rodada_editavel(p_rodada_id bigint)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.rodadas
    where id = p_rodada_id
      and status = 'ABERTA'
      and now() < trava_em
  );
$$;

revoke all on function public.fn_rodada_editavel(bigint) from public;
grant execute on function public.fn_rodada_editavel(bigint) to anon, authenticated, service_role;

drop policy "time próprio: criar" on public.times;
drop policy "time próprio: atualizar" on public.times;
drop policy "time próprio: excluir" on public.times;
drop policy "jogadores do próprio time: criar" on public.times_jogadores;
drop policy "jogadores do próprio time: atualizar" on public.times_jogadores;
drop policy "jogadores do próprio time: excluir" on public.times_jogadores;

create policy "time próprio antes da trava: criar" on public.times
  for insert to authenticated
  with check (usuario_id = (select auth.uid()) and public.fn_rodada_editavel(rodada_id));

create policy "time próprio antes da trava: atualizar" on public.times
  for update to authenticated
  using (usuario_id = (select auth.uid()) and public.fn_rodada_editavel(rodada_id))
  with check (usuario_id = (select auth.uid()) and public.fn_rodada_editavel(rodada_id));

create policy "time próprio antes da trava: excluir" on public.times
  for delete to authenticated
  using (usuario_id = (select auth.uid()) and public.fn_rodada_editavel(rodada_id));

create policy "jogadores do próprio time antes da trava: criar" on public.times_jogadores
  for insert to authenticated
  with check (
    exists (
      select 1 from public.times
      where times.id = times_jogadores.time_id
        and times.usuario_id = (select auth.uid())
        and public.fn_rodada_editavel(times.rodada_id)
    )
  );

create policy "jogadores do próprio time antes da trava: atualizar" on public.times_jogadores
  for update to authenticated
  using (
    exists (
      select 1 from public.times
      where times.id = times_jogadores.time_id
        and times.usuario_id = (select auth.uid())
        and public.fn_rodada_editavel(times.rodada_id)
    )
  )
  with check (
    exists (
      select 1 from public.times
      where times.id = times_jogadores.time_id
        and times.usuario_id = (select auth.uid())
        and public.fn_rodada_editavel(times.rodada_id)
    )
  );

create policy "jogadores do próprio time antes da trava: excluir" on public.times_jogadores
  for delete to authenticated
  using (
    exists (
      select 1 from public.times
      where times.id = times_jogadores.time_id
        and times.usuario_id = (select auth.uid())
        and public.fn_rodada_editavel(times.rodada_id)
    )
  );

-- Salva a escalação de forma atômica, validando trava, jogadores, formação e saldo.
-- Roda com os privilégios do usuário: as políticas acima continuam valendo.
-- Erros de regra usam SQLSTATE 'ES4xx' com mensagem pronta para o usuário.
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
