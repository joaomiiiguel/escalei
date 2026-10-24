-- Todas as Edge Functions que chamam a API-Football registram suas execuções,
-- permitindo somar requisições e acompanhar a cota diária.
alter table public.sync_execucoes drop constraint sync_execucoes_tipo_check;
alter table public.sync_execucoes
  add constraint sync_execucoes_tipo_check check (tipo in ('RODADA', 'JOGO', 'PONTUACAO', 'ORQUESTRADOR'));

create index sync_execucoes_iniciado_em_cota_idx
  on public.sync_execucoes (iniciado_em desc)
  where cota_restante is not null;
