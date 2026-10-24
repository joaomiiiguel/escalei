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
