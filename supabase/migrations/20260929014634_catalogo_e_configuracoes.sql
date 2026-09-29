create type status_jogo as enum (
  'A_JOGAR',
  'EM_ANDAMENTO',
  'ENCERRADO',
  'ADIADO',
  'CANCELADO'
);

alter table clubes
  add column cor_primaria char(7),
  add column cor_secundaria char(7),
  add column api_atualizado_em timestamptz,
  add column atualizado_em timestamptz not null default now(),
  add constraint clubes_cor_primaria_hex_check
    check (cor_primaria is null or cor_primaria ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint clubes_cor_secundaria_hex_check
    check (cor_secundaria is null or cor_secundaria ~ '^#[0-9A-Fa-f]{6}$');

alter table jogadores
  add column nome_exibicao text,
  add column numero smallint,
  add column preco_inicial numeric(5,2),
  add column media_temporada numeric(5,2) not null default 0,
  add column media_ult5 numeric(5,2) not null default 0,
  add column jogos_temporada smallint not null default 0,
  add column status status_jogador not null default 'PROVAVEL',
  add column status_motivo text,
  add column api_atualizado_em timestamptz,
  add column criado_em timestamptz not null default now(),
  add column atualizado_em timestamptz not null default now(),
  add constraint jogadores_preco_inicial_check
    check (preco_inicial is null or preco_inicial between 2 and 20),
  add constraint jogadores_medias_nao_negativas_check
    check (media_temporada >= 0 and media_ult5 >= 0),
  add constraint jogadores_jogos_temporada_nao_negativo_check
    check (jogos_temporada >= 0);

update jogadores
set
  nome_exibicao = left(nome, 16),
  preco_inicial = preco
where nome_exibicao is null or preco_inicial is null;

alter table jogadores
  alter column nome_exibicao set not null,
  alter column preco_inicial set not null,
  add constraint jogadores_nome_exibicao_tamanho_check
    check (char_length(nome_exibicao) between 1 and 16);

alter table rodadas
  add column rotulo_api text,
  add column abre_em timestamptz,
  add column fechada_em timestamptz,
  add column versao_regras smallint,
  add column criado_em timestamptz not null default now(),
  add column atualizado_em timestamptz not null default now();

update rodadas
set rotulo_api = format('Regular Season - %s', numero)
where rotulo_api is null;

alter table rodadas
  alter column rotulo_api set not null;

create table versoes_pontuacao (
  versao smallint primary key check (versao > 0),
  publicada_em timestamptz not null default now()
);

insert into versoes_pontuacao (versao)
values (1)
on conflict (versao) do nothing;

create table tabela_pontuacao (
  versao smallint not null references versoes_pontuacao(versao),
  scout text not null check (length(trim(scout)) > 0),
  posicao posicao not null,
  pontos numeric(4,2) not null,
  publicada_em timestamptz not null default now(),
  primary key (versao, scout, posicao)
);

alter table rodadas
  alter column versao_regras set default 1;

update rodadas
set versao_regras = 1
where versao_regras is null;

alter table rodadas
  alter column versao_regras set not null,
  add constraint rodadas_versao_regras_fkey
  foreign key (versao_regras) references versoes_pontuacao (versao);

create table jogos (
  id integer primary key,
  rodada_id bigint not null references rodadas(id),
  clube_casa_id integer not null references clubes(id),
  clube_fora_id integer not null references clubes(id),
  inicio_em timestamptz not null,
  status status_jogo not null,
  status_api varchar(5),
  gols_casa smallint check (gols_casa >= 0),
  gols_fora smallint check (gols_fora >= 0),
  pontuado_em timestamptz,
  conferido_em timestamptz,
  api_atualizado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (clube_casa_id <> clube_fora_id)
);

create table estatisticas_jogador (
  jogo_id integer not null references jogos(id) on delete cascade,
  jogador_id integer not null references jogadores(id),
  rodada_id bigint not null references rodadas(id),
  clube_id integer not null references clubes(id),
  minutos smallint not null default 0 check (minutos >= 0),
  posicao_jogo char(1) check (posicao_jogo in ('G', 'D', 'M', 'F')),
  substituto boolean not null default false,
  nota_api numeric(3,1),
  gols smallint not null default 0 check (gols >= 0),
  assistencias smallint not null default 0 check (assistencias >= 0),
  finalizacoes smallint not null default 0 check (finalizacoes >= 0),
  finalizacoes_no_gol smallint not null default 0 check (finalizacoes_no_gol >= 0),
  desarmes smallint not null default 0 check (desarmes >= 0),
  faltas_sofridas smallint not null default 0 check (faltas_sofridas >= 0),
  faltas_cometidas smallint not null default 0 check (faltas_cometidas >= 0),
  impedimentos smallint not null default 0 check (impedimentos >= 0),
  amarelos smallint not null default 0 check (amarelos >= 0),
  vermelhos smallint not null default 0 check (vermelhos >= 0),
  defesas smallint not null default 0 check (defesas >= 0),
  gols_sofridos smallint not null default 0 check (gols_sofridos >= 0),
  penaltis_sofridos smallint not null default 0 check (penaltis_sofridos >= 0),
  penaltis_cometidos smallint not null default 0 check (penaltis_cometidos >= 0),
  penaltis_perdidos smallint not null default 0 check (penaltis_perdidos >= 0),
  penaltis_defendidos smallint not null default 0 check (penaltis_defendidos >= 0),
  gols_contra smallint not null default 0 check (gols_contra >= 0),
  sem_sofrer_gol boolean not null default false,
  pontos numeric(6,2) not null default 0,
  versao_leitura smallint not null default 1 check (versao_leitura in (1, 2)),
  payload_api jsonb not null default '{}'::jsonb,
  lido_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (jogo_id, jogador_id)
);

create table historico_precos (
  jogador_id integer not null references jogadores(id),
  rodada_id bigint not null references rodadas(id),
  preco numeric(5,2) not null check (preco between 2 and 20),
  variacao numeric(4,2) not null,
  criado_em timestamptz not null default now(),
  primary key (jogador_id, rodada_id)
);

create table configuracoes (
  chave text primary key check (chave ~ '^[a-z0-9_]+$'),
  valor jsonb not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

insert into configuracoes (chave, valor)
values
  ('temporada_atual', '2026'::jsonb),
  ('liga_api_id', '71'::jsonb),
  ('orcamento', '100'::jsonb),
  ('reserva_cota_api', '15'::jsonb),
  ('pesquisa_ativa', 'false'::jsonb)
on conflict (chave) do nothing;

create index jogos_rodada_id_idx on jogos (rodada_id);
create index jogos_status_inicio_em_idx on jogos (status, inicio_em);
create index estatisticas_jogador_rodada_jogador_idx
  on estatisticas_jogador (rodada_id, jogador_id);
create index estatisticas_jogador_jogador_lido_em_idx
  on estatisticas_jogador (jogador_id, lido_em desc);

create trigger clubes_definir_atualizado_em
before update on clubes
for each row execute function public.definir_atualizado_em();

create trigger jogadores_definir_atualizado_em
before update on jogadores
for each row execute function public.definir_atualizado_em();

create trigger rodadas_definir_atualizado_em
before update on rodadas
for each row execute function public.definir_atualizado_em();

create trigger jogos_definir_atualizado_em
before update on jogos
for each row execute function public.definir_atualizado_em();

create trigger estatisticas_jogador_definir_atualizado_em
before update on estatisticas_jogador
for each row execute function public.definir_atualizado_em();

create trigger configuracoes_definir_atualizado_em
before update on configuracoes
for each row execute function public.definir_atualizado_em();

alter table jogos enable row level security;
alter table estatisticas_jogador enable row level security;
alter table tabela_pontuacao enable row level security;
alter table versoes_pontuacao enable row level security;
alter table historico_precos enable row level security;
alter table configuracoes enable row level security;

grant select on jogos, estatisticas_jogador, tabela_pontuacao, historico_precos
  to anon, authenticated;
grant select on versoes_pontuacao to anon, authenticated;
grant select, insert, update, delete on configuracoes to service_role;

revoke insert, update, delete on jogos, estatisticas_jogador, tabela_pontuacao,
  versoes_pontuacao, historico_precos from anon, authenticated;
revoke all on configuracoes from anon, authenticated;

create policy "jogos públicos" on jogos
  for select to anon, authenticated using (true);

create policy "estatísticas públicas" on estatisticas_jogador
  for select to anon, authenticated using (true);

create policy "pontuação pública" on tabela_pontuacao
  for select to anon, authenticated using (true);

create policy "versões de pontuação públicas" on versoes_pontuacao
  for select to anon, authenticated using (true);

create policy "histórico de preços público" on historico_precos
  for select to anon, authenticated using (true);
