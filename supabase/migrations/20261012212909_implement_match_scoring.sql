-- Pontuação calculada a partir dos scouts normalizados em estatisticas_jogador.
-- A fonte externa só grava scouts; as regras ficam versionadas no banco para que
-- uma rodada sempre possa ser reproduzida com a mesma tabela de pontos.

create table public.ranking_rodada (
  rodada_id bigint not null references public.rodadas(id) on delete cascade,
  usuario_id uuid not null references public.perfis(id) on delete cascade,
  pontos numeric(7,2) not null default 0,
  posicao integer not null,
  posicao_anterior integer,
  atualizado_apos_jogo_id integer references public.jogos(id) on delete set null,
  atualizado_em timestamptz not null default now(),
  primary key (rodada_id, usuario_id)
);

create index ranking_rodada_posicao_idx
  on public.ranking_rodada (rodada_id, posicao);

alter table public.ranking_rodada enable row level security;

grant select on public.ranking_rodada to anon, authenticated;
revoke insert, update, delete on public.ranking_rodada from anon, authenticated;

create policy "ranking público" on public.ranking_rodada
  for select to anon, authenticated using (true);

-- Versão 1: regras oficiais do MVP. Scouts não aplicáveis recebem valor zero
-- para manter uma consulta única e auditável durante o cálculo.
insert into public.tabela_pontuacao (versao, scout, posicao, pontos)
values
  (1, 'gols', 'GOL', 8), (1, 'gols', 'DEF', 8), (1, 'gols', 'MEI', 8), (1, 'gols', 'ATA', 8),
  (1, 'assistencias', 'GOL', 5), (1, 'assistencias', 'DEF', 5), (1, 'assistencias', 'MEI', 5), (1, 'assistencias', 'ATA', 5),
  (1, 'finalizacoes_no_gol', 'GOL', 1.2), (1, 'finalizacoes_no_gol', 'DEF', 1.2), (1, 'finalizacoes_no_gol', 'MEI', 1.2), (1, 'finalizacoes_no_gol', 'ATA', 1.2),
  (1, 'finalizacoes_fora', 'GOL', 0.8), (1, 'finalizacoes_fora', 'DEF', 0.8), (1, 'finalizacoes_fora', 'MEI', 0.8), (1, 'finalizacoes_fora', 'ATA', 0.8),
  (1, 'desarmes', 'GOL', 1.5), (1, 'desarmes', 'DEF', 1.5), (1, 'desarmes', 'MEI', 1.5), (1, 'desarmes', 'ATA', 1.5),
  (1, 'faltas_sofridas', 'GOL', 0.5), (1, 'faltas_sofridas', 'DEF', 0.5), (1, 'faltas_sofridas', 'MEI', 0.5), (1, 'faltas_sofridas', 'ATA', 0.5),
  (1, 'penaltis_sofridos', 'GOL', 1), (1, 'penaltis_sofridos', 'DEF', 1), (1, 'penaltis_sofridos', 'MEI', 1), (1, 'penaltis_sofridos', 'ATA', 1),
  (1, 'defesas', 'GOL', 1.3), (1, 'defesas', 'DEF', 0), (1, 'defesas', 'MEI', 0), (1, 'defesas', 'ATA', 0),
  (1, 'penaltis_defendidos', 'GOL', 7), (1, 'penaltis_defendidos', 'DEF', 0), (1, 'penaltis_defendidos', 'MEI', 0), (1, 'penaltis_defendidos', 'ATA', 0),
  (1, 'sem_sofrer_gol', 'GOL', 5), (1, 'sem_sofrer_gol', 'DEF', 5), (1, 'sem_sofrer_gol', 'MEI', 0), (1, 'sem_sofrer_gol', 'ATA', 0),
  (1, 'gols_sofridos', 'GOL', -1), (1, 'gols_sofridos', 'DEF', 0), (1, 'gols_sofridos', 'MEI', 0), (1, 'gols_sofridos', 'ATA', 0),
  (1, 'faltas_cometidas', 'GOL', -0.3), (1, 'faltas_cometidas', 'DEF', -0.3), (1, 'faltas_cometidas', 'MEI', -0.3), (1, 'faltas_cometidas', 'ATA', -0.3),
  (1, 'impedimentos', 'GOL', -0.1), (1, 'impedimentos', 'DEF', -0.1), (1, 'impedimentos', 'MEI', -0.1), (1, 'impedimentos', 'ATA', -0.1),
  (1, 'amarelos', 'GOL', -1), (1, 'amarelos', 'DEF', -1), (1, 'amarelos', 'MEI', -1), (1, 'amarelos', 'ATA', -1),
  (1, 'vermelhos', 'GOL', -3), (1, 'vermelhos', 'DEF', -3), (1, 'vermelhos', 'MEI', -3), (1, 'vermelhos', 'ATA', -3),
  (1, 'penaltis_perdidos', 'GOL', -4), (1, 'penaltis_perdidos', 'DEF', -4), (1, 'penaltis_perdidos', 'MEI', -4), (1, 'penaltis_perdidos', 'ATA', -4),
  (1, 'penaltis_cometidos', 'GOL', -1), (1, 'penaltis_cometidos', 'DEF', -1), (1, 'penaltis_cometidos', 'MEI', -1), (1, 'penaltis_cometidos', 'ATA', -1),
  (1, 'gols_contra', 'GOL', -3), (1, 'gols_contra', 'DEF', -3), (1, 'gols_contra', 'MEI', -3), (1, 'gols_contra', 'ATA', -3)
on conflict (versao, scout, posicao) do update
  set pontos = excluded.pontos;

create or replace function public.fn_pontuar_jogo(p_jogo_id integer)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_rodada_id bigint;
  v_versao smallint;
begin
  select jogo.rodada_id, rodada.versao_regras
    into v_rodada_id, v_versao
  from public.jogos jogo
  join public.rodadas rodada on rodada.id = jogo.rodada_id
  where jogo.id = p_jogo_id;

  if v_rodada_id is null then
    raise exception 'Jogo % não encontrado', p_jogo_id;
  end if;

  update public.estatisticas_jogador estatistica
  set pontos = case
    when estatistica.minutos = 0 then 0
    else coalesce((
      select sum(regra.pontos * case regra.scout
        when 'gols' then estatistica.gols
        when 'assistencias' then estatistica.assistencias
        -- A API retorna finalizações no gol incluindo gols; gol já vale +8.
        when 'finalizacoes_no_gol' then greatest(estatistica.finalizacoes_no_gol - estatistica.gols, 0)
        when 'finalizacoes_fora' then greatest(estatistica.finalizacoes - estatistica.finalizacoes_no_gol, 0)
        when 'desarmes' then estatistica.desarmes
        when 'faltas_sofridas' then estatistica.faltas_sofridas
        when 'penaltis_sofridos' then estatistica.penaltis_sofridos
        when 'defesas' then estatistica.defesas
        when 'penaltis_defendidos' then estatistica.penaltis_defendidos
        when 'sem_sofrer_gol' then case when estatistica.sem_sofrer_gol then 1 else 0 end
        when 'gols_sofridos' then estatistica.gols_sofridos
        when 'faltas_cometidas' then estatistica.faltas_cometidas
        when 'impedimentos' then estatistica.impedimentos
        when 'amarelos' then estatistica.amarelos
        when 'vermelhos' then estatistica.vermelhos
        when 'penaltis_perdidos' then estatistica.penaltis_perdidos
        when 'penaltis_cometidos' then estatistica.penaltis_cometidos
        when 'gols_contra' then estatistica.gols_contra
        else 0
      end)
      from public.tabela_pontuacao regra
      where regra.versao = v_versao
        and regra.posicao = jogador.posicao
    ), 0)
    end
  from public.jogadores jogador
  where estatistica.jogo_id = p_jogo_id
    and jogador.id = estatistica.jogador_id;

  update public.times_jogadores time_jogador
  set pontos = estatistica.pontos,
      pontuado = true
  from public.times time
  join public.estatisticas_jogador estatistica
    on estatistica.jogo_id = p_jogo_id
   and estatistica.jogador_id = time_jogador.jogador_id
  where time_jogador.time_id = time.id
    and time.rodada_id = v_rodada_id;

  update public.times time
  set pontos = coalesce((
        select sum(time_jogador.pontos)
        from public.times_jogadores time_jogador
        where time_jogador.time_id = time.id
      ), 0),
      gols_escalados = coalesce((
        select sum(estatistica.gols)
        from public.times_jogadores time_jogador
        join public.estatisticas_jogador estatistica
          on estatistica.rodada_id = v_rodada_id
         and estatistica.jogador_id = time_jogador.jogador_id
        where time_jogador.time_id = time.id
      ), 0)
  where time.rodada_id = v_rodada_id;

  insert into public.ranking_rodada (
    rodada_id, usuario_id, pontos, posicao, atualizado_apos_jogo_id
  )
  select
    v_rodada_id,
    time.usuario_id,
    time.pontos,
    rank() over (
      order by time.pontos desc, time.gols_escalados desc, time.custo asc, time.salvo_em asc
    )::integer,
    p_jogo_id
  from public.times time
  where time.rodada_id = v_rodada_id
  on conflict (rodada_id, usuario_id) do update
    set pontos = excluded.pontos,
        posicao_anterior = public.ranking_rodada.posicao,
        posicao = excluded.posicao,
        atualizado_apos_jogo_id = excluded.atualizado_apos_jogo_id,
        atualizado_em = now();

  update public.jogos
  set pontuado_em = now()
  where id = p_jogo_id;
end;
$$;

revoke all on function public.fn_pontuar_jogo(integer) from public, anon, authenticated;
grant execute on function public.fn_pontuar_jogo(integer) to service_role;
