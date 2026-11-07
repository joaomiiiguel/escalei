---
titulo: API-Football
tipo: nota-de-integracao
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/tecnico
  - integracao/api-football
---

# API-Football

← [[Index]] · Campos no banco: [[Banco de Dados — Modelo e Campos]]

> [!abstract] Em uma frase
> Fonte de clubes, elencos, jogos e scouts. A integração usa a API-Football v3, com a Série A no identificador `71` e autenticação pelo cabeçalho `x-apisports-key`.

> [!info] Temporada em uso (06/11/2026)
> Desde 27/10/2026 o app usa a **Série A 2026** real, com plano informado de 7.500 requisições por dia ([[2026-10-27 — Virada para o Brasileirão 2026]]). A Série A 2024 foi usada só na simulação, que saiu do ar.

> [!warning] Cobertura e permissões
> O plano gratuito restringe temporadas recentes. Antes de trocar a temporada sincronizada, verifique o plano com `npm run check:api -- <temporada>`.

## Endpoints usados (conferido em 06/11/2026)

| Endpoint | Para quê | Quem chama e quando |
|---|---|---|
| `/teams?league=71&season={ano}` | `clubes` | `sync-catalog`, segunda 9h UTC |
| `/players?league=71&season={ano}` (paginado) | `jogadores`, posição e preço inicial | `sync-catalog`, segunda 9h UTC |
| `/fixtures?league=71&season={ano}` | calendário: rodadas, jogos, `abre_em` e `trava_em` | `sync-calendar`, a cada 6 h |
| `/fixtures?ids=` (até 20) | status e placar dos jogos em andamento | `advance-round`, só durante os jogos |
| `/injuries` | lesionados e suspensos | `advance-round`, a cada 6 h com a rodada aberta e uma vez nas 2 h antes da trava |
| `/fixtures/players?fixture={id}` | scouts individuais por jogo | `score-match`, no fim e na conferência |
| `/fixtures/events?fixture={id}` | gol contra e substituições | `score-match`, no fim e na conferência |

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

**`games.substitute` não é confiável (JOA-170):** nas respostas reais da rodada 32, 7 de 10 jogos trazem `false` para os 23 relacionados. `buildScouts` reconstrói `substituto` com os dados que já lê: entrou por evento `subst` (`assist` é quem entra, `player` é quem sai) ou ficou com 0 minutos. O mercado mostra "Sem dados do último jogo" quando o clube não tem entre 1 e 11 titulares no jogo, o que cobre as linhas gravadas antes dessa correção.

---

*Criado em 28/09/2026.*
