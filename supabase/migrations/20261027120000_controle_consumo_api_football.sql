-- Controle de consumo da API-Football (JOA-145).
-- 1. Tentativas de pontuação com pausa crescente: um jogo que falha não é
--    tentado de novo a cada execução do orquestrador.
-- 2. Orçamento diário contado pelo próprio projeto (soma de requisições em
--    sync_execucoes no dia UTC), sem depender do cabeçalho da API.

alter table public.jogos
  add column pontuacao_tentativas smallint not null default 0 check (pontuacao_tentativas >= 0),
  add column pontuacao_proxima_tentativa_em timestamptz,
  add column pontuacao_ultimo_erro text;

create index jogos_pontuacao_pendente_idx
  on public.jogos (rodada_id, pontuacao_proxima_tentativa_em)
  where pontuado_em is null or conferido_em is null;

insert into public.configuracoes (chave, valor)
values
  ('api_football_limite_diario', '7500'::jsonb),
  ('api_football_reserva_diaria', '500'::jsonb),
  ('api_football_max_tentativas_pontuacao', '10'::jsonb)
on conflict (chave) do nothing;

-- A reserva antiga (15) era do plano gratuito de 100 requisições/dia.
delete from public.configuracoes where chave = 'reserva_cota_api';

-- Requisições já feitas desde `p_desde` (início do dia UTC da API).
create or replace function public.fn_requisicoes_api_football(p_desde timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select coalesce(sum(requisicoes), 0)::integer
  from public.sync_execucoes
  where iniciado_em >= p_desde;
$$;

revoke all on function public.fn_requisicoes_api_football(timestamptz) from public, anon, authenticated;
grant execute on function public.fn_requisicoes_api_football(timestamptz) to service_role;

