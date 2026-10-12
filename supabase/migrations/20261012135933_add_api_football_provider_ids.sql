alter table public.clubes add column api_football_id integer;
alter table public.jogadores add column api_football_id integer;
alter table public.jogos add column api_football_id integer;

create unique index clubes_api_football_id_key on public.clubes (api_football_id) where api_football_id is not null;
create unique index jogadores_api_football_id_key on public.jogadores (api_football_id) where api_football_id is not null;
create unique index jogos_api_football_id_key on public.jogos (api_football_id) where api_football_id is not null;
