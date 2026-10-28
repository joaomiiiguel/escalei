# Fixtures da API-Football

Respostas **sintéticas** no formato dos endpoints `/fixtures/players` e
`/fixtures/events` da API-Football v3. Não são dados reais de partidas: foram
escritas à mão para cobrir os casos de pontuação (gols, cartões, clean sheet,
substitutos, valores nulos, gol contra e correção pós-jogo) sem gastar cota.

Quando houver uma chamada real bem-sucedida, salve o JSON aqui ao lado e
acrescente os casos nos testes, sem substituir estes arquivos.

Cenário: clube da casa (API 100) 3 × 0 visitante (API 200), partida encerrada.

| Arquivo | Conteúdo |
|---|---|
| `fixture-1001-players.json` | Primeira leitura dos scouts |
| `fixture-1001-events.json` | Eventos (inclui um gol contra) |
| `fixture-1001-players-conferencia.json` | Segunda leitura: uma finalização do atacante reclassificada como no gol e o amarelo do zagueiro anulado |

## Temporada 2026 (`2026/`)

Respostas **reais** gravadas em 27/10/2026 (plano Pro), sem a chave da API:

| Arquivo | Endpoint |
|---|---|
| `teams.json` | `/teams?league=71&season=2026` |
| `players-page-1.json` | `/players?league=71&season=2026&page=1` (1 de 44 páginas) |
| `fixtures.json` | `/fixtures?league=71&season=2026`, reduzido aos campos usados (id, data, status, rodada, clubes, placar) |

### Rodada 32 (`2026/rodada-32/`)

Respostas **reais** de `/fixtures/players` e `/fixtures/events` dos 10 jogos da
rodada 32, gravadas em 28/10/2026 com `npm run record:round -- 2026 32`
(20 requisições), sem a chave da API. Usadas no teste ponta a ponta
`tests/db/rodada-ponta-a-ponta.test.ts`.

Particularidade real: em `fixture-1492420-players.json` (Chapecoense × Fluminense)
a API devolve a Chapecoense com o id de time `22722` e nome nulo, diferente do id
`132` de `/teams` e `/fixtures`. `buildScouts` atribui esse time ao clube do jogo
que ficou sem correspondência.
