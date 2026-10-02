alter table perfis
  add column telefone text;

alter table perfis
  add constraint perfis_telefone_formato_check
  check (telefone is null or telefone ~ '^\+55[1-9][0-9]9[0-9]{8}$');

create unique index perfis_telefone_unico_idx
  on perfis (telefone)
  where telefone is not null;

comment on column perfis.telefone is
  'Telefone brasileiro em E.164, espelhado de auth.users somente após OTP SMS validado.';
