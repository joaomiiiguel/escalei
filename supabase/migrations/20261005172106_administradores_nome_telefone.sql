alter table public.administradores
  add column nome text,
  add column telefone text;

update public.administradores as administrador
set
  nome = perfil.apelido,
  telefone = perfil.telefone
from public.perfis as perfil
where perfil.id = administrador.usuario_id;

alter table public.administradores
  alter column nome set not null,
  alter column telefone set not null,
  add constraint administradores_nome_tamanho_check
    check (char_length(trim(nome)) between 3 and 20),
  add constraint administradores_telefone_formato_check
    check (telefone ~ '^\+55[1-9][0-9]9[0-9]{8}$');

create unique index administradores_telefone_unico_idx
  on public.administradores (telefone);
