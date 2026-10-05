create type tipo_liga as enum ('CONVITE', 'ABERTA');

create table public.administradores (
  usuario_id uuid primary key references public.perfis(id) on delete cascade,
  criado_em timestamptz not null default now()
);

create table public.ligas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 3 and 40),
  icone text not null default '⚽' check (char_length(icone) between 1 and 8),
  dono_id uuid not null references public.perfis(id) on delete restrict,
  tipo tipo_liga not null default 'CONVITE',
  codigo_convite varchar(8) not null unique check (codigo_convite ~ '^[A-HJ-NP-Z2-9]{8}$'),
  token_convite uuid not null unique default gen_random_uuid(),
  convite_expira_em timestamptz,
  temporada smallint not null check (temporada between 2024 and 2100),
  criada_em timestamptz not null default now(),
  arquivada_em timestamptz
);

create table public.ligas_membros (
  liga_id uuid not null references public.ligas(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  convidado_por uuid references public.perfis(id) on delete set null,
  entrou_em timestamptz not null default now(),
  primary key (liga_id, usuario_id)
);

create index ligas_dono_id_idx on public.ligas (dono_id);
create index ligas_ativas_idx on public.ligas (arquivada_em) where arquivada_em is null;
create index ligas_membros_usuario_id_idx on public.ligas_membros (usuario_id);

alter table public.administradores enable row level security;
alter table public.ligas enable row level security;
alter table public.ligas_membros enable row level security;

grant select on public.administradores, public.ligas, public.ligas_membros to authenticated;
grant insert, update, delete on public.ligas, public.ligas_membros to authenticated;

create policy "administrador lê o próprio acesso" on public.administradores
  for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "administrador gerencia ligas" on public.ligas
  for all to authenticated
  using (exists (select 1 from public.administradores where usuario_id = (select auth.uid())))
  with check (exists (select 1 from public.administradores where usuario_id = (select auth.uid())));

create policy "administrador gerencia membros de ligas" on public.ligas_membros
  for all to authenticated
  using (exists (select 1 from public.administradores where usuario_id = (select auth.uid())))
  with check (exists (select 1 from public.administradores where usuario_id = (select auth.uid())));
