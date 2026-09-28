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
> Fonte de elenco, jogos e scouts. O **plano grátis (100 requisições/dia)** basta para a validação **sem parcial ao vivo**: o pior dia de rodada gasta ~45 requisições.

> [!warning] Fonte das informações
> O site oficial bloqueou o acesso automatizado com verificação anti-bot, que não foi contornada. Planos, campos e frequências vêm de fontes públicas secundárias (28/09/2026). **Tudo precisa ser conferido com a chave grátis.**

## Planos

| Plano | Preço | Requisições/dia |
|---|--:|--:|
| **Free** | US$ 0 | **100** |
| Pro | US$ 19/mês | 7.500 |
| Ultra | US$ 29/mês | 75.000 |
| Mega | US$ 39/mês | 150.000 |

Sem cobrança de excedente: ao bater o limite, as chamadas param. A frequência de atualização é de ~15 s para jogos e eventos e ~1 min para estatística de jogador.

## Endpoints usados

| Endpoint | Para quê | Frequência |
|---|---|---|
| `/leagues?id=71&season=2026` | Confirmar a cobertura (`coverage.fixtures.statistics_players`) | 1× |
| `/teams?league=71&season=2026` | Carga de `clubes` | 1× por temporada |
| `/players/squads?team={id}` | Carga de `jogadores` | 1× por semana × 20 times |
| `/fixtures?league=71&season=2026&round=…` | Jogos e status da rodada | a cada 20 min, só na janela de jogos |
| `/fixtures?id={id}` | Eventos + escalações + estatísticas + jogadores **numa chamada** | 1× no fim do jogo + 1× de conferência |
| `/injuries?league=71&season=2026` | Status de lesão/suspensão | 1× por dia |

A **Série A é, até onde se sabe, a league id 71**. Confirmar.

## Orçamento de requisições (pior dia de rodada)

| Chamada | Requisições |
|---|--:|
| Status da rodada, a cada 20 min das 16h às 24h | ~24 |
| Estatística de cada jogo encerrado + conferência | ~20 |
| Lesões | 1 |
| **Total** | **~45 / 100** |

Elencos (20 requisições) rodam num **dia sem jogo**. Cada execução é registrada em `sync_execucoes`, que protege a cota (ver [[Banco de Dados — Modelo e Campos]]).

## Verificação antes de programar

```bash
curl -s "https://v3.football.api-sports.io/leagues?id=71&season=2026" -H "x-apisports-key: $API_FOOTBALL_KEY"
curl -s "https://v3.football.api-sports.io/fixtures?league=71&season=2026&last=1" -H "x-apisports-key: $API_FOOTBALL_KEY"
curl -s "https://v3.football.api-sports.io/fixtures/players?fixture=ID_DO_JOGO" -H "x-apisports-key: $API_FOOTBALL_KEY"
```

- [ ] A temporada **2026** está liberada no plano grátis? Planos grátis costumam restringir temporadas. Se não estiver: Pro por 1 mês (US$ 19).
- [ ] `coverage.fixtures.statistics_players = true` na Série A
- [ ] `/fixtures/players` traz `tackles`, `goals.saves`, `fouls`, `penalty`
- [ ] Os campos vêm como `null` ou 0 quando o jogador não fez o scout?
- [ ] Quanto tempo depois do apito final as estatísticas aparecem?
- [ ] `team.code` (sigla) vem preenchido para os 20 clubes?
- [ ] Os termos de uso permitem uso comercial num app gratuito?

## Riscos

- **Precisão do scout:** comparar uma rodada com a súmula e um site de referência.
- **Correções pós-jogo:** tratadas pela 2ª leitura no dia seguinte.
- **Queda da API:** a rodada fecha mais tarde. O app mostra "pontuação atrasada" em vez de pontos errados.
- **Mudança de preço ou de plano:** o projeto não depende de nada exclusivo da API-Football. Sportmonks (a partir de ~€ 29/mês) é a alternativa.

---

*Criado em 28/09/2026.*
