create extension if not exists citext;
create extension if not exists pgcrypto;
create type posicao as enum ('GOL','DEF','MEI','ATA');
create type formacao as enum ('4-3-3','4-4-2','3-5-2');
create type status_jogador as enum ('PROVAVEL','DUVIDA','LESIONADO','SUSPENSO');
create type status_rodada as enum ('AGENDADA','ABERTA','EM_ANDAMENTO','FECHADA');

create table clubes (id int primary key, nome text not null, sigla char(3) unique not null, ativo boolean not null default true, criado_em timestamptz not null default now());
create table perfis (id uuid primary key references auth.users(id) on delete cascade, apelido citext unique not null check (apelido ~ '^[A-Za-z0-9_.]{3,20}$'), clube_coracao_id int references clubes(id), tema text not null default 'escuro' check (tema in ('escuro','claro')), notificacoes_email boolean not null default true, termos_versao text not null, termos_aceitos_em timestamptz not null, criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now());
create table rodadas (id bigserial primary key, temporada smallint not null, numero smallint not null check (numero between 1 and 38), status status_rodada not null, trava_em timestamptz not null, unique(temporada, numero));
create table jogadores (id int primary key, clube_id int not null references clubes(id), nome text not null, posicao posicao not null, preco numeric(5,2) not null check (preco between 2 and 20), ativo boolean not null default true);
create table times (id uuid primary key default gen_random_uuid(), usuario_id uuid not null references perfis(id) on delete cascade, rodada_id bigint not null references rodadas(id), formacao formacao not null, custo numeric(6,2) not null default 0 check (custo <= 100), salvo_em timestamptz not null default now(), unique(usuario_id, rodada_id));
create table times_jogadores (time_id uuid references times(id) on delete cascade, jogador_id int references jogadores(id), posicao posicao not null, preco_pago numeric(5,2) not null, primary key(time_id, jogador_id));

create index jogadores_clube_id_idx on jogadores(clube_id);
create index jogadores_posicao_preco_idx on jogadores(posicao, preco) where ativo;
create index times_jogadores_jogador_id_idx on times_jogadores(jogador_id);

create function public.definir_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger perfis_definir_atualizado_em
before update on perfis
for each row execute function public.definir_atualizado_em();

alter table perfis enable row level security; alter table clubes enable row level security; alter table rodadas enable row level security; alter table jogadores enable row level security; alter table times enable row level security; alter table times_jogadores enable row level security;

grant usage on schema public to anon, authenticated;
grant select on clubes, rodadas, jogadores to anon, authenticated;
grant select, insert, update on perfis to authenticated;
grant select, insert, update, delete on times, times_jogadores to authenticated;
grant usage, select on sequence rodadas_id_seq to authenticated;

create policy "catalogo público" on clubes for select to anon, authenticated using (true);
create policy "rodadas públicas" on rodadas for select to anon, authenticated using (true);
create policy "jogadores públicos" on jogadores for select to anon, authenticated using (true);

create policy "perfil próprio: ler" on perfis for select to authenticated using ((select auth.uid()) = id);
create policy "perfil próprio: criar" on perfis for insert to authenticated with check ((select auth.uid()) = id);
create policy "perfil próprio: atualizar" on perfis for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "time próprio: ler" on times for select to authenticated using ((select auth.uid()) = usuario_id);
create policy "time próprio: criar" on times for insert to authenticated with check ((select auth.uid()) = usuario_id);
create policy "time próprio: atualizar" on times for update to authenticated using ((select auth.uid()) = usuario_id) with check ((select auth.uid()) = usuario_id);
create policy "time próprio: excluir" on times for delete to authenticated using ((select auth.uid()) = usuario_id);

create policy "jogadores do próprio time: ler" on times_jogadores for select to authenticated using (exists(select 1 from times where times.id = time_id and times.usuario_id = (select auth.uid())));
create policy "jogadores do próprio time: criar" on times_jogadores for insert to authenticated with check (exists(select 1 from times where times.id = time_id and times.usuario_id = (select auth.uid())));
create policy "jogadores do próprio time: atualizar" on times_jogadores for update to authenticated using (exists(select 1 from times where times.id = time_id and times.usuario_id = (select auth.uid()))) with check (exists(select 1 from times where times.id = time_id and times.usuario_id = (select auth.uid())));
create policy "jogadores do próprio time: excluir" on times_jogadores for delete to authenticated using (exists(select 1 from times where times.id = time_id and times.usuario_id = (select auth.uid())));
