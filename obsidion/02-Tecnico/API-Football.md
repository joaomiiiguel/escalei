---
titulo: API-Football
tipo: nota-de-integracao
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/tecnico
  - integracao/football-data
---

# API-Football

← [[Index]] · Campos no banco: [[Banco de Dados — Modelo e Campos]]

> [!abstract] Em uma frase
> Fonte de clubes, elencos, jogos e scouts. A integração usa a API-Football v3, com a Série A no identificador `71` e autenticação pelo cabeçalho `x-apisports-key`.

> [!warning] Cobertura e permissões
> O plano gratuito oferece endpoints, mas restringe temporadas recentes. No teste, usar explicitamente a Série A de **2024**. Não apontar o ambiente gratuito para a temporada corrente sem uma verificação de acesso da chave contratada.

## Endpoints usados

| Endpoint | Para quê | Frequência |
|---|---|---|
| `/v3/football/teams?league=71&season={ano}` | Carga de `clubes` | 1× por temporada |
| `/v3/football/players?team={id}&season={ano}` | Carga de `jogadores` e posição | 1× por semana × 20 times |
| `/v3/football/fixtures?league=71&season={ano}&round={rodada}` | Jogos e status da rodada | job futuro |
| `/v3/football/fixtures/players?fixture={id}` | Scouts individuais por jogo | fim e conferência do jogo |
| `/v3/football/fixtures/events?fixture={id}` | Gol contra e eventos | fim e conferência do jogo |

## Verificação antes de programar

```bash
curl -s "https://v3.football.api-sports.io/leagues?id=71&season=2024" -H "x-apisports-key: $API_FOOTBALL_KEY"
curl -s "https://v3.football.api-sports.io/fixtures?league=71&season=2024&round=Regular%20Season%20-%201" -H "x-apisports-key: $API_FOOTBALL_KEY"
curl -s "https://v3.football.api-sports.io/fixtures/players?fixture=ID_DO_JOGO" -H "x-apisports-key: $API_FOOTBALL_KEY"
```

- [ ] A chave gratuita permite consultar `league=71&season=2024`.
- [ ] `/teams` retorna os 20 clubes com código e logo válidos.
- [ ] `/players` retorna jogadores com posição em `statistics[].games.position`.
- [ ] A resposta de `/fixtures/players` contém todos os scouts da tabela de pontuação em um jogo real.

## Riscos

- **Temporada corrente:** o plano gratuito não é fonte aprovada para a temporada atual; produção exige plano compatível ou nova decisão de produto.
- **Queda da API:** a rodada fecha mais tarde. O app mostra "pontuação atrasada" em vez de pontos errados.
- **Mudança de plano:** confirmar disponibilidade da Série A antes de sincronizar dados reais.


## Consumo e verificação (27/10/2026)

**Plano informado:** 7.500 requisições/dia.

**Consumo esperado por rodada de 10 jogos:** sincronização horária da rodada (24/dia) + status dos jogos em lote durante as partidas (`/fixtures?ids=`, até 20 jogos por chamada, ~60 por rodada) + pontuação e conferência (4 por jogo, 40 por rodada). Bem abaixo de 1.000/dia.

**Incidente de 24–27/10:** 5 jogos encerrados sem pontuação eram tentados a cada 2 minutos (2 requisições cada) → ~7.200 requisições/dia, todas com falha. Corrigido em JOA-145 com pausa crescente entre tentativas, limite de tentativas e orçamento diário contado pelo projeto.

**Chave:** em 27/10 a chave configurada (`.env` e secrets das Edge Functions) era recusada pela API (`/status` → "Missing application key").

**Verificar plano e temporada:** `npm run check:api -- 2026`. O `/status` não consome cota; o resto gasta no máximo 3 requisições. Mostra o plano, o uso do dia, a cobertura declarada da Série A na temporada e se o último jogo encerrado tem scouts de jogadores.

---

*Criado em 28/09/2026.*
