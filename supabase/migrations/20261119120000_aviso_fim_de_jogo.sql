-- Aviso de fim de jogo: quando um jogo encerrado de rodada real é pontuado pela primeira vez,
-- quem tem time na rodada recebe o placar e a pontuação dos seus escalados nesse jogo.
-- O texto é personalizado por usuário, então é montado em `notify-whatsapp` na hora do envio;
-- aqui fica só a fila, com um aviso por jogo.

create table public.avisos_jogo (
  jogo_id integer primary key references public.jogos(id) on delete cascade,
  rodada_id bigint not null references public.rodadas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  push_enviado_em timestamptz
);

comment on table public.avisos_jogo is
  'Fila do push de fim de jogo. Um aviso por jogo, enfileirado na primeira pontuação do jogo encerrado.';

create index avisos_jogo_pendentes_idx on public.avisos_jogo (criado_em) where push_enviado_em is null;

-- Sem políticas: só a service_role acessa, a partir de `notify-whatsapp`.
alter table public.avisos_jogo enable row level security;
revoke all on public.avisos_jogo from anon, authenticated;
grant select, insert, update, delete on public.avisos_jogo to service_role;

create function public.fn_enfileirar_aviso_fim_de_jogo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Jogo adiado ou cancelado também é pontuado (com zero), mas não tem placar para avisar.
  if new.status <> 'ENCERRADO'
    or exists (select 1 from public.rodadas rodada where rodada.id = new.rodada_id and rodada.simulada) then
    return null;
  end if;

  insert into public.avisos_jogo (jogo_id, rodada_id)
  values (new.id, new.rodada_id)
  on conflict (jogo_id) do nothing;
  return null;
end;
$$;

-- `fn_pontuar_jogo` grava `pontuado_em` a cada leitura; só a primeira (sem conferência) avisa.
create trigger jogos_enfileirar_aviso_fim_de_jogo
after update of pontuado_em on public.jogos
for each row
when (old.pontuado_em is null and new.pontuado_em is not null)
execute function public.fn_enfileirar_aviso_fim_de_jogo();

revoke all on function public.fn_enfileirar_aviso_fim_de_jogo() from public, anon, authenticated;
