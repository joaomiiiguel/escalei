-- Passes de rodada pagos (JOA-151). Ver obsidion/07-Decisoes/2026-10-27 — Passes de rodada pagos.md.
-- Passe é dinheiro real, em centavos; não se mistura com o saldo em C$ de `carteiras`.
-- Só o modelo de dados: exigir e consumir o passe fica na JOA-152 e o pagamento, na JOA-153.

create table public.produtos_passe (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  quantidade integer not null check (quantidade > 0),
  preco_centavos integer not null check (preco_centavos > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

insert into public.produtos_passe (codigo, nome, quantidade, preco_centavos)
values
  ('AVULSO', 'Passe de rodada', 1, 499),
  ('PACOTE_5', 'Pacote com 5 passes', 5, 1999);

-- Pedidos sobrevivem à exclusão da conta (registro fiscal): só perdem o vínculo com o usuário.
create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfis(id) on delete set null,
  produto_id bigint not null references public.produtos_passe(id),
  valor_centavos integer not null check (valor_centavos > 0),
  status text not null default 'PENDENTE'
    check (status in ('PENDENTE', 'PAGO', 'EXPIRADO', 'CANCELADO', 'ESTORNADO')),
  provedor_id text unique,
  pago_em timestamptz,
  nota_emitida_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint pedidos_pago_com_data check (status not in ('PAGO', 'ESTORNADO') or pago_em is not null),
  constraint pedidos_nota_so_apos_pagamento check (nota_emitida_em is null or pago_em is not null)
);

create index pedidos_usuario_id_idx on public.pedidos (usuario_id);
create index pedidos_produto_id_idx on public.pedidos (produto_id);

-- `unique (pedido_id)`: um pedido gera no máximo um lote, mesmo com webhook repetido.
create table public.passes_lotes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  pedido_id uuid unique references public.pedidos(id),
  origem text not null check (origem in ('COMPRA', 'CORTESIA')),
  quantidade integer not null check (quantidade > 0),
  restantes integer not null,
  valido_ate_temporada smallint not null,
  criado_em timestamptz not null default now(),
  unique (id, usuario_id),
  constraint passes_lotes_restantes_validos check (restantes between 0 and quantidade),
  constraint passes_lotes_compra_com_pedido check ((origem = 'COMPRA') = (pedido_id is not null))
);

create index passes_lotes_usuario_validade_idx on public.passes_lotes (usuario_id, valido_ate_temporada);

create table public.passes_movimentacoes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  lote_id bigint not null,
  rodada_id bigint references public.rodadas(id),
  tipo text not null check (tipo in ('CREDITO', 'CONSUMO', 'ESTORNO', 'EXPIRACAO')),
  quantidade integer not null check (quantidade > 0),
  criado_em timestamptz not null default now(),
  foreign key (lote_id, usuario_id) references public.passes_lotes (id, usuario_id) on delete cascade,
  constraint passes_movimentacoes_rodada_coerente check ((tipo in ('CONSUMO', 'ESTORNO')) = (rodada_id is not null))
);

-- Um consumo e um estorno por usuário e rodada: repetir a trava não debita duas vezes.
create unique index passes_movimentacoes_rodada_unica
  on public.passes_movimentacoes (usuario_id, rodada_id, tipo)
  where rodada_id is not null;

create index passes_movimentacoes_lote_id_idx on public.passes_movimentacoes (lote_id);
create index passes_movimentacoes_rodada_id_idx on public.passes_movimentacoes (rodada_id);

alter table public.produtos_passe enable row level security;
alter table public.pedidos enable row level security;
alter table public.passes_lotes enable row level security;
alter table public.passes_movimentacoes enable row level security;

revoke all on public.produtos_passe, public.pedidos, public.passes_lotes, public.passes_movimentacoes
  from anon, authenticated, service_role;

grant select on public.produtos_passe to anon, authenticated;
grant select on public.pedidos, public.passes_lotes, public.passes_movimentacoes to authenticated;

grant select, insert, update on public.produtos_passe, public.pedidos, public.passes_lotes to service_role;
-- Livro somente de inserção, até para o servidor.
grant select, insert on public.passes_movimentacoes to service_role;

create policy "catálogo de passes: ler" on public.produtos_passe
  for select to anon, authenticated
  using (true);

create policy "pedidos próprios: ler" on public.pedidos
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

create policy "lotes de passes próprios: ler" on public.passes_lotes
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

create policy "movimentações de passes próprias: ler" on public.passes_movimentacoes
  for select to authenticated
  using ((select auth.uid()) = usuario_id);

-- Definer porque `configuracoes` é restrita ao servidor; só enxerga os lotes de auth.uid().
create or replace function public.fn_passes_disponiveis()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(lote.restantes), 0)::integer
  from public.passes_lotes lote
  where lote.usuario_id = auth.uid()
    and lote.valido_ate_temporada >= (
      select (configuracao.valor #>> '{}')::smallint
      from public.configuracoes configuracao
      where configuracao.chave = 'temporada_atual'
    );
$$;

revoke all on function public.fn_passes_disponiveis() from public, anon;
grant execute on function public.fn_passes_disponiveis() to authenticated;
