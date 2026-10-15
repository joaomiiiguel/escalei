# Orquestrador da Rodada Simulada

## Objetivo

`advance-simulated-round` transforma uma rodada histórica em uma experiência
temporal de teste. A função é chamada pelo `pg_cron` a cada dois minutos e é
idempotente: uma nova execução apenas retoma o próximo estado pendente.

```text
AGENDADA
  └─ abre_em alcançada, após a rodada anterior fechar → ABERTA
       └─ trava_em alcançada → EM_ANDAMENTO
            └─ inicio_simulado_em de cada jogo → ENCERRADO
                 └─ score-match → scouts, pontos e ranking
                      └─ todos pontuados + 1h → conferência
                           └─ fn_atualizar_precos + fn_creditar_saldos_rodada → FECHADA
```

## Dados e responsabilidades

| Componente | Responsabilidade |
|---|---|
| `advance-simulated-round` | Abre a próxima rodada agendada, controla o tempo simulado, lê placar final da API-Football e agenda a conferência. |
| `score-match` | Lê scouts e eventos, grava `estatisticas_jogador` e chama `fn_pontuar_jogo`. |
| `fn_pontuar_jogo` | Aplica a versão de regras da rodada, atualiza times e ranking. |
| `fn_atualizar_precos` | Calcula a variação de preço pelos pontos da rodada versus a média dos cinco jogos anteriores, grava a foto para a próxima rodada e atualiza o catálogo uma única vez. |
| `fn_creditar_saldos_rodada` | Credita `max(pontos − preço pago, 0)` na carteira de cada time da rodada, com uma movimentação única e auditável. |
| `pg_cron` | Dispara o orquestrador de dois em dois minutos. |

O orquestrador nunca inventa placares. Para cada jogo devido, consulta
`/fixtures?id=<api_football_id>` e só muda para `ENCERRADO` se a fonte indicar
`FT`, `AET` ou `PEN`.

## Falhas e reexecução

- Jogo ainda não finalizado na fonte: permanece pendente e será tentado depois.
- Falha de pontuação: o jogo permanece `ENCERRADO` com `pontuado_em` vazio; a
  próxima execução chama `score-match` novamente.
- Conferência: após todos os jogos pontuados, `fechamento_simulado_em` é gravado
  para uma hora após a pontuação do último jogo. O mesmo fluxo relê os scouts com `conferencia: true` e
  somente então fecha a rodada.

## Operação

O cron depende de `cron_project_url` e `cron_publishable_key` no Supabase Vault,
configurados pela migration de sincronização. A função também requer
`API_FOOTBALL_KEY`, `API_FOOTBALL_SEASON=2024`, `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY`; os dois últimos são fornecidos pelo runtime.
