create table public.ligas_convites_email (
  liga_id uuid not null references public.ligas(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  convidado_por uuid not null references public.perfis(id) on delete restrict,
  usuario_id uuid references public.perfis(id) on delete set null,
  criado_em timestamptz not null default now(),
  aceito_em timestamptz,
  primary key (liga_id, email)
);

create unique index ligas_convites_email_usuario_unico_idx
  on public.ligas_convites_email (liga_id, usuario_id)
  where usuario_id is not null;

alter table public.ligas_convites_email enable row level security;
revoke all on public.ligas_convites_email from anon, authenticated;
