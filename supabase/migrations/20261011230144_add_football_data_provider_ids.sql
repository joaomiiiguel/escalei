alter table public.clubes
  add column football_data_id integer;

alter table public.jogadores
  add column football_data_id integer;

create unique index clubes_football_data_id_key
  on public.clubes (football_data_id)
  where football_data_id is not null;

create unique index jogadores_football_data_id_key
  on public.jogadores (football_data_id)
  where football_data_id is not null;
