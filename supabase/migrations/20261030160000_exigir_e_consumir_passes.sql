-- Exige o passe de rodada para escalar e o consome na trava (JOA-152).
-- Ver obsidion/07-Decisoes/2026-10-27 — Passes de rodada pagos.md.
--
-- `passes_obrigatorios` nasce desligado: sem a compra por PIX (JOA-153/JOA-154)
-- ninguém conseguiria repor passes. Ligado, salvar exige passe e a trava consome.
-- Cortesia, expiração e estorno funcionam com a chave em qualquer posição.

insert into public.configuracoes (chave, valor)
values ('passes_obrigatorios', 'false'::jsonb)
on conflict (chave) do nothing;

create or replace function public.fn_temporada_atual()
returns smallint
language sql
stable
security definer
set search_path = public
as $$
  select (valor #>> '{}')::smallint from public.configuracoes where chave = 'temporada_atual';
$$;

revoke all on function public.fn_temporada_atual() from public, anon, authenticated;

create or replace function public.fn_passes_obrigatorios()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select (valor #>> '{}')::boolean from public.configuracoes where chave = 'passes_obrigatorios'), false);
$$;

revoke all on function public.fn_passes_obrigatorios() from public, anon, authenticated;

-- Definer: `fn_salvar_escalacao` roda como o usuário, que não lê `configuracoes` nem `administradores`.
create or replace function public.fn_passe_libera_rodada(p_rodada_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.fn_passes_obrigatorios()
    or exists (select 1 from public.administradores adm where adm.usuario_id = auth.uid())
    or exists (
      select 1
      from public.rodadas rodada
      where rodada.id = p_rodada_id
        and (
          rodada.simulada
          or exists (
            select 1
            from public.passes_lotes lote
            where lote.usuario_id = auth.uid()
              and lote.restantes > 0
              and lote.valido_ate_temporada >= rodada.temporada
          )
        )
    );
$$;

revoke all on function public.fn_passe_libera_rodada(bigint) from public, anon;
grant execute on function public.fn_passe_libera_rodada(bigint) to authenticated;

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

create or replace function public.fn_expirar_passes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expirados integer;
begin
  with vencidos as (
    select id, usuario_id, restantes
    from public.passes_lotes
    where restantes > 0
      and valido_ate_temporada < public.fn_temporada_atual()
    for update
  ), registro as (
    insert into public.passes_movimentacoes (usuario_id, lote_id, tipo, quantidade)
    select usuario_id, id, 'EXPIRACAO', restantes
    from vencidos
  )
  update public.passes_lotes lote
  set restantes = 0
  from vencidos
  where lote.id = vencidos.id;

  get diagnostics v_expirados = row_count;
  return v_expirados;
end;
$$;

revoke all on function public.fn_expirar_passes() from public, anon, authenticated;
grant execute on function public.fn_expirar_passes() to service_role;

-- Um passe por time salvo, do lote que vence primeiro. Idempotente: o índice único
-- de `passes_movimentacoes` impede debitar duas vezes, mesmo com execuções simultâneas.
-- Time sem passe válido (chave ligada com a rodada aberta, reembolso) joga sem débito.
create or replace function public.fn_consumir_passes_rodada(p_rodada_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rodada public.rodadas%rowtype;
  v_time record;
  v_lote_id bigint;
  v_movimentacao_id bigint;
  v_consumidos integer := 0;
begin
  select * into v_rodada from public.rodadas where id = p_rodada_id;
  if not found then
    raise exception 'Rodada % não encontrada.', p_rodada_id;
  end if;
  if now() < v_rodada.trava_em then
    raise exception 'A rodada % ainda não travou.', p_rodada_id;
  end if;

  perform public.fn_expirar_passes();

  if v_rodada.simulada or not public.fn_passes_obrigatorios() then
    return 0;
  end if;

  for v_time in
    select time_salvo.usuario_id
    from public.times time_salvo
    where time_salvo.rodada_id = p_rodada_id
      and not exists (select 1 from public.administradores adm where adm.usuario_id = time_salvo.usuario_id)
      and not exists (
        select 1
        from public.passes_movimentacoes movimentacao
        where movimentacao.usuario_id = time_salvo.usuario_id
          and movimentacao.rodada_id = p_rodada_id
          and movimentacao.tipo = 'CONSUMO'
      )
  loop
    select id into v_lote_id
    from public.passes_lotes
    where usuario_id = v_time.usuario_id
      and restantes > 0
      and valido_ate_temporada >= v_rodada.temporada
    order by valido_ate_temporada, id
    limit 1
    for update;

    continue when v_lote_id is null;

    insert into public.passes_movimentacoes (usuario_id, lote_id, rodada_id, tipo, quantidade)
    values (v_time.usuario_id, v_lote_id, p_rodada_id, 'CONSUMO', 1)
    on conflict (usuario_id, rodada_id, tipo) where rodada_id is not null do nothing
    returning id into v_movimentacao_id;

    continue when v_movimentacao_id is null;

    update public.passes_lotes set restantes = restantes - 1 where id = v_lote_id;
    v_consumidos := v_consumidos + 1;
  end loop;

  return v_consumidos;
end;
$$;

revoke all on function public.fn_consumir_passes_rodada(bigint) from public, anon, authenticated;
grant execute on function public.fn_consumir_passes_rodada(bigint) to service_role;

-- Devolve os passes só se a rodada foi cancelada por inteiro: todos os jogos adiados ou cancelados.
create or replace function public.fn_estornar_passes_rodada(p_rodada_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estornados integer;
begin
  if not exists (select 1 from public.jogos where rodada_id = p_rodada_id)
    or exists (
      select 1 from public.jogos
      where rodada_id = p_rodada_id
        and status not in ('ADIADO', 'CANCELADO')
    ) then
    return 0;
  end if;

  with consumos as (
    select consumo.usuario_id, consumo.lote_id
    from public.passes_movimentacoes consumo
    where consumo.rodada_id = p_rodada_id
      and consumo.tipo = 'CONSUMO'
      and not exists (
        select 1
        from public.passes_movimentacoes estorno
        where estorno.usuario_id = consumo.usuario_id
          and estorno.rodada_id = p_rodada_id
          and estorno.tipo = 'ESTORNO'
      )
  ), registro as (
    insert into public.passes_movimentacoes (usuario_id, lote_id, rodada_id, tipo, quantidade)
    select usuario_id, lote_id, p_rodada_id, 'ESTORNO', 1
    from consumos
    on conflict (usuario_id, rodada_id, tipo) where rodada_id is not null do nothing
    returning lote_id
  )
  update public.passes_lotes lote
  set restantes = lote.restantes + 1
  from registro
  where lote.id = registro.lote_id;

  get diagnostics v_estornados = row_count;
  return v_estornados;
end;
$$;

revoke all on function public.fn_estornar_passes_rodada(bigint) from public, anon, authenticated;
grant execute on function public.fn_estornar_passes_rodada(bigint) to service_role;

-- Cortesia: 2 passes por perfil, válidos na temporada atual e na seguinte.
-- O perfil nasce ao concluir o onboarding; o gatilho de insert não dispara no upsert de quem já existe.
create or replace function public.fn_conceder_cortesia_passes(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lote_id bigint;
begin
  insert into public.passes_lotes (usuario_id, origem, quantidade, restantes, valido_ate_temporada)
  values (p_usuario_id, 'CORTESIA', 2, 2, public.fn_temporada_atual() + 1)
  returning id into v_lote_id;

  insert into public.passes_movimentacoes (usuario_id, lote_id, tipo, quantidade)
  values (p_usuario_id, v_lote_id, 'CREDITO', 2);
end;
$$;

revoke all on function public.fn_conceder_cortesia_passes(uuid) from public, anon, authenticated;

create or replace function public.conceder_cortesia_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.fn_conceder_cortesia_passes(new.id);
  return new;
end;
$$;

revoke all on function public.conceder_cortesia_do_usuario() from public, anon, authenticated;

create trigger perfis_conceder_cortesia_passes
after insert on public.perfis
for each row execute function public.conceder_cortesia_do_usuario();

-- Quem já tinha conta também recebe a cortesia.
select public.fn_conceder_cortesia_passes(id) from public.perfis;
