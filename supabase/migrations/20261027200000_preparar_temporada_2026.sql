-- Preparação para o Brasileirão 2026 real (JOA-147). Não apaga dados.
-- Pode ser aplicada antes da virada: só amplia tipos e registra a rodada de estreia.

-- Registro das novas Edge Functions em sync_execucoes.
alter table public.sync_execucoes drop constraint sync_execucoes_tipo_check;
alter table public.sync_execucoes
  add constraint sync_execucoes_tipo_check
  check (tipo in ('RODADA', 'JOGO', 'PONTUACAO', 'ORQUESTRADOR', 'CATALOGO', 'CALENDARIO'));

-- Reset dos saldos na virada da temporada: o ajuste pode diminuir o saldo,
-- então valor e saldo final só são restritos para rendimentos e ajustes antigos.
alter table public.movimentacoes_saldo drop constraint movimentacoes_saldo_tipo_check;
alter table public.movimentacoes_saldo
  add constraint movimentacoes_saldo_tipo_check
  check (tipo in ('RENDIMENTO', 'AJUSTE_SALDO_INICIAL', 'AJUSTE_TEMPORADA_2026'));

alter table public.movimentacoes_saldo drop constraint movimentacoes_saldo_valor_check;
alter table public.movimentacoes_saldo
  add constraint movimentacoes_saldo_valor_check
  check (tipo = 'AJUSTE_TEMPORADA_2026' or valor >= 0);

alter table public.movimentacoes_saldo drop constraint movimentacoes_saldo_check;
alter table public.movimentacoes_saldo
  add constraint movimentacoes_saldo_check
  check (tipo = 'AJUSTE_TEMPORADA_2026' or saldo_depois >= saldo_antes);

create unique index movimentacoes_saldo_ajuste_temporada_2026_unico
  on public.movimentacoes_saldo (usuario_id)
  where tipo = 'AJUSTE_TEMPORADA_2026';

-- O calendário oficial registra rodadas a partir da estreia; as anteriores ficam fora.
insert into public.configuracoes (chave, valor)
values ('rodada_estreia', '33'::jsonb)
on conflict (chave) do update set valor = excluded.valor, atualizado_em = now();
