---
titulo: football-data.org
tipo: nota-de-integracao
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/tecnico
  - integracao/football-data
---

# football-data.org

← [[Index]] · Campos no banco: [[Banco de Dados — Modelo e Campos]]

> [!abstract] Em uma frase
> Fonte de clubes, elencos e jogos. A integração usa a API v4, com o código da competição brasileira `BSA` e autenticação pelo cabeçalho `X-Auth-Token`.

> [!warning] Cobertura e permissões
> A documentação lista o Campeonato Brasileiro Série A como `BSA` e plano `TIER_ONE`. Confirme, com uma chave do projeto, que a assinatura contratada permite clubes, elencos e jogos da temporada antes de executar uma carga.

## Endpoints usados

| Endpoint | Para quê | Frequência |
|---|---|---|
| `/v4/competitions/BSA/teams?season={ano}` | Carga de `clubes` | 1× por temporada |
| `/v4/teams/{id}` | Carga de `jogadores` pelo campo `squad` | 1× por semana × 20 times |
| `/v4/competitions/BSA/matches?matchday={rodada}` | Jogos e status da rodada | job futuro |
| `/v4/matches/{id}` | Placar, eventos e escalações disponíveis | job futuro |

## Verificação antes de programar

```bash
curl -s "https://api.football-data.org/v4/competitions/BSA/teams?season=2026" -H "X-Auth-Token: $FOOTBALL_DATA_API_KEY"
curl -s "https://api.football-data.org/v4/competitions/BSA/matches?matchday=1" -H "X-Auth-Token: $FOOTBALL_DATA_API_KEY"
curl -s "https://api.football-data.org/v4/teams/ID_DO_TIME" -H "X-Auth-Token: $FOOTBALL_DATA_API_KEY"
```

- [ ] A assinatura do projeto permite consultar `BSA` na temporada escolhida.
- [ ] `/competitions/BSA/teams` retorna os 20 clubes com `tla` e `crest` válidos.
- [ ] `/teams/{id}` retorna o elenco no campo `squad`, com `position` e `shirtNumber`.
- [ ] A cobertura dos endpoints de partidas atende a pontuação necessária antes de ativar o job de rodadas.

## Riscos

- **Cobertura de scouts:** a carga atual não grava estatísticas individuais de jogo; não ativar pontuação real até validar os dados disponíveis.
- **Queda da API:** a rodada fecha mais tarde. O app mostra "pontuação atrasada" em vez de pontos errados.
- **Mudança de plano:** confirmar disponibilidade da Série A antes de sincronizar dados reais.

---

*Criado em 28/09/2026.*
