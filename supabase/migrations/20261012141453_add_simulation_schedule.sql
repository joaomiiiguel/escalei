alter table public.rodadas
  add column simulada boolean not null default false,
  add column inicio_simulado_em timestamptz,
  add column fechamento_simulado_em timestamptz;

alter table public.jogos
  add column inicio_simulado_em timestamptz;

create index jogos_inicio_simulado_em_idx
  on public.jogos (inicio_simulado_em)
  where inicio_simulado_em is not null;

comment on column public.rodadas.simulada is
  'Indica que a rodada usa dados históricos apresentados em calendário simulado.';
comment on column public.rodadas.inicio_simulado_em is
  'Início exibido no ambiente de teste; o calendário-fonte permanece auditável em jogos.inicio_em.';
comment on column public.jogos.inicio_simulado_em is
  'Momento em que um jogo histórico passa a ser exibido e pode disparar pontuação no teste.';

insert into public.configuracoes (chave, valor)
values
  ('modo_simulacao', 'true'::jsonb),
  ('temporada_fonte', '2024'::jsonb),
  ('rodada_simulada_atual', '30'::jsonb)
on conflict (chave) do update
set valor = excluded.valor,
    atualizado_em = now();

update public.configuracoes
set valor = '2024'::jsonb,
    atualizado_em = now()
where chave = 'temporada_atual';
