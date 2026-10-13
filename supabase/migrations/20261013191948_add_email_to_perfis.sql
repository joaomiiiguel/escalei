alter table public.perfis
  add column email citext;

update public.perfis perfil
set email = lower(usuario.email)
from auth.users usuario
where usuario.id = perfil.id;

alter table public.perfis
  alter column email set not null,
  add constraint perfis_email_formato_check
    check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

create unique index perfis_email_unico_idx
  on public.perfis (email);

comment on column public.perfis.email is
  'E-mail confirmado da conta autenticada, espelhado de auth.users.';
