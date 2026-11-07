# Pontuação de jogadores

## Fluxo de dados

```text
API-Football /fixtures/players + /fixtures/events
                 │
                 ▼
      score-match (Edge Function)
                 │ normaliza os scouts e preserva payload_api
                 ▼
      estatisticas_jogador
                 │ regras fixadas pela rodada
                 ▼
       fn_pontuar_jogo(jogo_id)
          ├── times_jogadores
          ├── times
          └── ranking_rodada
```

Cada jogo é pontuado somente após estar com status `ENCERRADO`. A função pode ser
chamada novamente para a leitura de conferência no dia seguinte: o `upsert` dos
scouts e o recálculo completo tornam a operação idempotente.

## Regras versionadas

`rodadas.versao_regras` aponta para `tabela_pontuacao`. A versão 1 implementa a
tabela de `Regras do Jogo.md`: gol (+8), assistência (+5), finalização no gol sem
o gol (+1,2), finalização para fora (+0,8), desarme (+1,5), falta sofrida (+0,5),
pênalti sofrido (+1), defesa (+1,3), pênalti defendido (+7), saldo sem sofrer gol
(+5 para GOL/DEF com ao menos 60 minutos), gol sofrido do goleiro (-1), falta
cometida (-0,3), impedimento (-0,1), amarelo (-1), vermelho (-3), pênalti perdido
(-4), pênalti cometido (-1) e gol contra (-3).

Quem não entra em campo recebe zero. Jogo cancelado ou adiado não aciona a função.

## Operação

Desde 27/10/2026 a pontuação roda sobre o **Brasileirão 2026 real**: o orquestrador `advance-round` chama `score-match` para cada jogo encerrado e de novo na conferência, 1 hora depois do último jogo pontuado. Falhas seguem a pausa crescente de JOA-145 (ver [[Banco de Dados — Modelo e Campos]]).

Para pontuar um jogo à mão, chame a função `score-match` com:

```json
{ "jogoId": 1234567890 }
```

Para a segunda leitura, repita com `{ "jogoId": 1234567890, "conferencia": true }`.

A Edge Function usa `API_FOOTBALL_KEY`, `API_FOOTBALL_LEAGUE_ID=71` e `API_FOOTBALL_SEASON` (2026) nos secrets do Supabase. O cliente nunca recebe a chave.

---

*Atualizado em 06/11/2026: a operação de homologação com a Série A 2024 saiu do ar na virada para 2026.*
