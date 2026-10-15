create table public.carteiras (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  saldo numeric(8,2) not null default 50.00 check (saldo >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.movimentacoes_saldo (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  rodada_id bigint not null references public.rodadas(id),
  time_id uuid not null references public.times(id) on delete cascade,
  tipo text not null check (tipo = 'RENDIMENTO'),
  valor numeric(8,2) not null check (valor >= 0),
  saldo_antes numeric(8,2) not null check (saldo_antes >= 0),
  saldo_depois numeric(8,2) not null check (saldo_depois >= saldo_antes),
  criado_em timestamptz not null default now(),
  unique (usuario_id, rodada_id, tipo)
);

create index movimentacoes_saldo_rodada_id_idx on public.movimentacoes_saldo (rodada_id);
create index movimentacoes_saldo_time_id_idx on public.movimentacoes_saldo (time_id);

insert into public.carteiras (usuario_id)
select id
from public.perfis
on conflict (usuario_id) do nothing;

create or replace function public.criar_carteira_do_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.carteiras (usuario_id)
  values (new.id)
  on conflict (usuario_id) do nothing;
  return new;
end;
$$;

revoke all on function public.criar_carteira_do_usuario() from public, anon, authenticated;

create trigger perfis_criar_carteira
after insert on public.perfis
for each row execute function public.criar_carteira_do_usuario();

alter table public.carteiras enable row level security;
alter table public.movimentacoes_saldo enable row level security;

grant select on public.carteiras, public.movimentacoes_saldo to authenticated;

create policy "carteira própria: ler" on public.carteiras
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

create policy "movimentações próprias: ler" on public.movimentacoes_saldo
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

create or replace function public.fn_creditar_saldos_rodada(p_rodada_id bigint)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(p_rodada_id);

  if exists (
    select 1
    from public.jogos
    where rodada_id = p_rodada_id
      and pontuado_em is null
  ) then
    raise exception 'A rodada % possui jogos sem pontuação', p_rodada_id;
  end if;

  with ganhos as (
    select time.usuario_id,
           time.id as time_id,
           round(sum(greatest(time_jogador.pontos - time_jogador.preco_pago, 0)), 2) as valor
    from public.times time
    join public.times_jogadores time_jogador on time_jogador.time_id = time.id
    where time.rodada_id = p_rodada_id
    group by time.usuario_id, time.id
  ), creditos as (
    insert into public.movimentacoes_saldo (
      usuario_id, rodada_id, time_id, tipo, valor, saldo_antes, saldo_depois
    )
    select ganho.usuario_id,
           p_rodada_id,
           ganho.time_id,
           'RENDIMENTO',
           ganho.valor,
           carteira.saldo,
           carteira.saldo + ganho.valor
    from ganhos ganho
    join public.carteiras carteira on carteira.usuario_id = ganho.usuario_id
    on conflict (usuario_id, rodada_id, tipo) do nothing
    returning usuario_id, valor
  )
  update public.carteiras carteira
  set saldo = carteira.saldo + credito.valor,
      atualizado_em = now()
  from creditos credito
  where carteira.usuario_id = credito.usuario_id;
end;
$$;

revoke all on function public.fn_creditar_saldos_rodada(bigint) from public, anon, authenticated;
grant execute on function public.fn_creditar_saldos_rodada(bigint) to service_role;
