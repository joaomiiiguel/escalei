# Orquestrador da Rodada Simulada

## Objetivo

`advance-simulated-round` transforma uma rodada histórica em uma experiência
temporal de teste. A função é chamada pelo `pg_cron` a cada dois minutos e é
idempotente: uma nova execução apenas retoma o próximo estado pendente.

```text
ABERTA
  └─ trava_em alcançada → EM_ANDAMENTO
       └─ inicio_simulado_em de cada jogo → ENCERRADO
            └─ score-match → scouts, pontos e ranking
                 └─ todos pontuados + 24h → conferência
                      └─ FECHADA
```

## Dados e responsabilidades

| Componente | Responsabilidade |
|---|---|
| `advance-simulated-round` | Controla tempo simulado, lê placar final da API-Football e agenda a conferência. |
| `score-match` | Lê scouts e eventos, grava `estatisticas_jogador` e chama `fn_pontuar_jogo`. |
| `fn_pontuar_jogo` | Aplica a versão de regras da rodada, atualiza times e ranking. |
| `pg_cron` | Dispara o orquestrador de dois em dois minutos. |

O orquestrador nunca inventa placares. Para cada jogo devido, consulta
`/fixtures?id=<api_football_id>` e só muda para `ENCERRADO` se a fonte indicar
`FT`, `AET` ou `PEN`.

## Falhas e reexecução

- Jogo ainda não finalizado na fonte: permanece pendente e será tentado depois.
- Falha de pontuação: o jogo permanece `ENCERRADO` com `pontuado_em` vazio; a
  próxima execução chama `score-match` novamente.
- Conferência: após todos os jogos pontuados, `fechamento_simulado_em` é gravado
  para 24 horas depois. O mesmo fluxo relê os scouts com `conferencia: true` e
  somente então fecha a rodada.

## Operação

O cron depende de `cron_project_url` e `cron_publishable_key` no Supabase Vault,
configurados pela migration de sincronização. A função também requer
`API_FOOTBALL_KEY`, `API_FOOTBALL_SEASON=2024`, `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY`; os dois últimos são fornecidos pelo runtime.
