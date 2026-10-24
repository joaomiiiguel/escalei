-- Cadastros da lista de espera do beta (/beta). Gravados somente pelo servidor.
create table public.lista_espera (
  id bigint generated always as identity primary key,
  nome text not null check (char_length(nome) between 2 and 60),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,11}$'),
  email citext not null unique check (char_length(email) <= 254),
  consentimento_em timestamptz not null default now(),
  origem text not null default 'beta',
  criado_em timestamptz not null default now()
);

alter table public.lista_espera enable row level security;

revoke all on public.lista_espera from anon, authenticated;
grant select, insert, update, delete on public.lista_espera to service_role;
