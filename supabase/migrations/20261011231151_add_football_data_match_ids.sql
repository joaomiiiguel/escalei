alter table public.jogos
  add column football_data_id integer,
  alter column status_api type varchar(16);

create unique index jogos_football_data_id_key
  on public.jogos (football_data_id)
  where football_data_id is not null;
