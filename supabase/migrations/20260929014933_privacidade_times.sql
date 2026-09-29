alter table perfis
  add column convidado_por uuid references perfis(id),
  add column origem text;

alter table times
  add column pontos numeric(7,2) not null default 0,
  add column gols_escalados smallint not null default 0 check (gols_escalados >= 0),
  add column criado_em timestamptz not null default now(),
  add column atualizado_em timestamptz not null default now();

alter table times_jogadores
  add column pontos numeric(6,2) not null default 0,
  add column pontuado boolean not null default false;

create index perfis_clube_coracao_id_idx on perfis (clube_coracao_id);
create index times_rodada_id_idx on times (rodada_id);
create index times_usuario_id_idx on times (usuario_id);

create trigger times_definir_atualizado_em
before update on times
for each row execute function public.definir_atualizado_em();

drop policy "time próprio: ler" on times;
drop policy "time próprio: criar" on times;
drop policy "time próprio: atualizar" on times;
drop policy "time próprio: excluir" on times;
drop policy "jogadores do próprio time: ler" on times_jogadores;
drop policy "jogadores do próprio time: criar" on times_jogadores;
drop policy "jogadores do próprio time: atualizar" on times_jogadores;
drop policy "jogadores do próprio time: excluir" on times_jogadores;

create policy "times próprios ou após trava: ler" on times
  for select to authenticated
  using (
    usuario_id = (select auth.uid())
    or exists (
      select 1
      from rodadas
      where rodadas.id = times.rodada_id
        and now() >= rodadas.trava_em
    )
  );

create policy "time próprio: criar" on times
  for insert to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "time próprio: atualizar" on times
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "time próprio: excluir" on times
  for delete to authenticated
  using (usuario_id = (select auth.uid()));

create policy "jogadores próprios ou após trava: ler" on times_jogadores
  for select to authenticated
  using (
    exists (
      select 1
      from times
      join rodadas on rodadas.id = times.rodada_id
      where times.id = times_jogadores.time_id
        and (
          times.usuario_id = (select auth.uid())
          or now() >= rodadas.trava_em
        )
    )
  );

create policy "jogadores do próprio time: criar" on times_jogadores
  for insert to authenticated
  with check (
    exists (
      select 1 from times
      where times.id = times_jogadores.time_id
        and times.usuario_id = (select auth.uid())
    )
  );

create policy "jogadores do próprio time: atualizar" on times_jogadores
  for update to authenticated
  using (
    exists (
      select 1 from times
      where times.id = times_jogadores.time_id
        and times.usuario_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from times
      where times.id = times_jogadores.time_id
        and times.usuario_id = (select auth.uid())
    )
  );

create policy "jogadores do próprio time: excluir" on times_jogadores
  for delete to authenticated
  using (
    exists (
      select 1 from times
      where times.id = times_jogadores.time_id
        and times.usuario_id = (select auth.uid())
    )
  );
