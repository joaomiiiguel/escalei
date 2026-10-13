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

## Operação de homologação

No teste, o catálogo usa a Série A 2024 e a rodada ativa vem de
`configuracoes.rodada_simulada_atual`; ela não é fixa no código. Após sincronizar
a rodada e ela estar encerrada no banco, chame a função `score-match` com:

```json
{ "jogoId": 1234567890 }
```

No dia seguinte, repita com `{ "jogoId": 1234567890, "conferencia": true }`.
Antes de publicar a Edge Function, configure no Supabase remoto
`API_FOOTBALL_KEY`, `API_FOOTBALL_LEAGUE_ID=71` e `API_FOOTBALL_SEASON=2024`.
O cliente nunca recebe a chave.
