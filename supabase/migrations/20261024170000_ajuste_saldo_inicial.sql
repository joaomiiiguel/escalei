-- O saldo inicial passou de C$ 50 para C$ 60 (20261024120000). Quem já tinha
-- recebido rendimento ficou partindo de C$ 50; essas carteiras recebem +C$ 10,00
-- uma única vez, registrado como movimentação auditável.

alter table public.movimentacoes_saldo drop constraint movimentacoes_saldo_tipo_check;
alter table public.movimentacoes_saldo
  add constraint movimentacoes_saldo_tipo_check check (tipo in ('RENDIMENTO', 'AJUSTE_SALDO_INICIAL'));

-- Ajustes não pertencem a uma rodada nem a um time.
alter table public.movimentacoes_saldo alter column rodada_id drop not null;
alter table public.movimentacoes_saldo alter column time_id drop not null;
alter table public.movimentacoes_saldo
  add constraint movimentacoes_saldo_rendimento_com_rodada
  check (tipo <> 'RENDIMENTO' or (rodada_id is not null and time_id is not null));

create unique index movimentacoes_saldo_ajuste_inicial_unico
  on public.movimentacoes_saldo (usuario_id)
  where tipo = 'AJUSTE_SALDO_INICIAL';

with alvos as (
  select carteira.usuario_id, carteira.saldo
  from public.carteiras carteira
  where exists (
      select 1 from public.movimentacoes_saldo movimentacao
      where movimentacao.usuario_id = carteira.usuario_id
        and movimentacao.tipo = 'RENDIMENTO'
    )
    and not exists (
      select 1 from public.movimentacoes_saldo movimentacao
      where movimentacao.usuario_id = carteira.usuario_id
        and movimentacao.tipo = 'AJUSTE_SALDO_INICIAL'
    )
), ajustes as (
  insert into public.movimentacoes_saldo (usuario_id, rodada_id, time_id, tipo, valor, saldo_antes, saldo_depois)
  select alvo.usuario_id, null, null, 'AJUSTE_SALDO_INICIAL', 10.00, alvo.saldo, alvo.saldo + 10.00
  from alvos alvo
  returning usuario_id, valor
)
update public.carteiras carteira
set saldo = carteira.saldo + ajuste.valor,
    atualizado_em = now()
from ajustes ajuste
where carteira.usuario_id = ajuste.usuario_id;
