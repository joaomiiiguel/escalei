---
titulo: 2026-10-27 — Virada para o Brasileirão 2026
tipo: decisao
projeto: Fantasy Futebol
criado-em: 2026-11-06
tags:
  - projeto/fantasy-futebol
  - registro/decisao
  - area/tecnico
---

# 2026-10-27 — Virada para o Brasileirão 2026

← [[Index]] · Operação: [[Ativação de Produção — Calendário e Orquestração]] · Simulação anterior: [[Orquestrador da Rodada Simulada]]

> [!info] Fonte
> Registrada em 06/11/2026 a partir das migrations `20261027190000_pausar_crons_simulacao`, `20261027200000_preparar_temporada_2026`, `20261027210000_virada_temporada_2026` e `20261027220000_manter_apenas_grupo_brasileiro_2026` (JOA-147), que trazem as decisões de produto de 27/10/2026 nos comentários.

## Decisões

| Decisão | Detalhe |
|---|---|
| Sair da simulação | A temporada histórica de 2024 deixa de rodar. Os dados da simulação (rodadas simuladas e tudo que depende delas) foram **apagados de forma definitiva**. |
| Temporada vigente | `temporada_atual = 2026`, Brasileirão real pela API-Football. |
| Estreia | Rodada **33**: o calendário oficial registra rodadas a partir de `rodada_estreia`. |
| Saldos | Todos voltam para **C$ 60,00**, com movimentação auditável. |
| Grupos | Os grupos ativos passam a disputar 2026. Na limpeza seguinte, ficou só o grupo "Brasileiro 2026 (Teste)"; usuários, perfis e saldos não foram apagados. |
| Agendamentos | Saem `sincronizar-rodada-horaria` e `avancar-rodada-simulada`. Entram `sincronizar-catalogo` (segunda, 9h UTC), `sincronizar-calendario` (a cada 6 h) e `avancar-rodada` (a cada 2 min, consultando a API só durante os jogos). |

## Consequências

- A [[API-Football]] precisa de plano com acesso à temporada corrente (plano informado: 7.500 requisições por dia).
- As Edge Functions da simulação (`advance-simulated-round`, `sync-round`) continuam no código, sem agendamento.

---

*Registrado em 06/11/2026.*
