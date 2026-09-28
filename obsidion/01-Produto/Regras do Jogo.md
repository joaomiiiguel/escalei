---
titulo: Regras do Jogo
tipo: produto
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/produto
  - area/regras
---

# Regras do Jogo

← [[Index]] · Fonte dos dados: [[API-Football]]

> [!abstract] Resumo
> 11 jogadores numa de 3 formações, orçamento de **C$ 100**, trava no primeiro jogo da rodada, **pontos lançados a cada jogo encerrado** (sem parcial ao vivo), sem prêmio.

## Posições: 4, e não 5

> [!warning] Restrição da fonte de dados
> A API-Football classifica os jogadores só como **Goalkeeper, Defender, Midfielder e Attacker** (`G/D/M/F`). Ela **não separa zagueiro de lateral**. Por isso o MVP usa **GOL · DEF · MEI · ATA**. Separar ZAG e LAT exigiria manter a posição à mão.

| Formação | GOL | DEF | MEI | ATA |
|---|:-:|:-:|:-:|:-:|
| 4-3-3 | 1 | 4 | 3 | 3 |
| 4-4-2 | 1 | 4 | 4 | 2 |
| 3-5-2 | 1 | 3 | 5 | 2 |

Sem técnico, sem capitão e sem banco de reservas no MVP.

## Orçamento e preço (proposta)

- Orçamento: **C$ 100** por rodada (média ~C$ 9 por vaga).
- **Preço inicial** = `clamp(3 + média de pontos na temporada, 2, 20)`. Jogador sem histórico começa em C$ 5.
- **Variação depois de cada rodada** = `clamp(0,25 × (pontos na rodada − média dos últimos 5 jogos), −2, +2)`, com preço mínimo de C$ 2.
- A variação aparece no mercado como ▲/▼.

> [!note] Os coeficientes são chute inicial. Calibrar com o histórico da temporada antes do beta, para que um time "só de craques" estoure o orçamento e um time "só de baratos" pontue mal.

## Trava e status

- A escalação **trava no início do primeiro jogo da rodada**. Depois disso, ninguém edita até a próxima rodada abrir.
- **Rodada:** Aberta → Em andamento (x de 10 jogos encerrados) → Fechada.
- **Jogo:** A jogar → Em andamento → Encerrado (pontuado).
- **Pontos:** lançados quando o jogo termina. **Fechamento oficial no dia seguinte ao último jogo**, com uma segunda leitura da API para pegar as correções de scout.
- **Jogo adiado ou cancelado:** os jogadores daquele jogo pontuam 0 na rodada.

## Tabela de pontuação (mapeada nos campos da API-Football)

| Scout | Pontos | Posição | Campo |
|---|--:|---|---|
| Gol | +8,0 | todas | `goals.total` |
| Assistência | +5,0 | todas | `goals.assists` |
| Finalização no gol (sem gol) | +1,2 | todas | `shots.on − goals.total` |
| Finalização para fora | +0,8 | todas | `shots.total − shots.on` |
| Desarme | +1,5 | todas | `tackles.total` |
| Falta sofrida | +0,5 | todas | `fouls.drawn` |
| Pênalti sofrido | +1,0 | todas | `penalty.won` |
| Defesa | +1,3 | GOL | `goals.saves` |
| Defesa de pênalti | +7,0 | GOL | `penalty.saved` |
| Jogo sem sofrer gol | +5,0 | GOL, DEF | time não sofreu gol **e** `games.minutes ≥ 60` |
| Gol sofrido | −1,0 | GOL | `goals.conceded` |
| Falta cometida | −0,3 | todas | `fouls.committed` |
| Impedimento | −0,1 | todas | `offsides` |
| Cartão amarelo | −1,0 | todas | `cards.yellow` |
| Cartão vermelho | −3,0 | todas | `cards.red` |
| Pênalti perdido | −4,0 | todas | `penalty.missed` |
| Pênalti cometido | −1,0 | todas | `penalty.commited` (grafia da API) |
| Gol contra | −3,0 | todas | `/fixtures/events` com `detail = "Own Goal"` |

- Jogador que **não entrou em campo** (`games.minutes` nulo ou 0) pontua 0.
- **Simplificação:** "jogo sem sofrer gol" usa o placar final do time, não "enquanto ele estava em campo".

## Formação e valor (28/09/2026)

**A formação não muda preço nem pontuação diretamente.** Não há bônus nem multiplicador por formação. O jogador vale o mesmo em qualquer esquema, e o scout pontua igual. O efeito é **indireto**, pela mistura de posições:

| Efeito | Como aparece |
|---|---|
| **Custo do time** | Muda conforme o preço médio de cada posição. Se atacante for mais caro, 4-3-3 aperta o orçamento. |
| **Fonte dos pontos** | Mais DEF = mais chance de "jogo sem sofrer gol" (+5 cada, correlacionado se forem do mesmo time). Mais ATA/MEI = mais chance de gol (+8) e assistência (+5). |
| **Risco** | Formação ofensiva tende a variar mais de rodada para rodada. A defensiva é mais estável. |

Exemplo **ilustrativo** (preço médio hipotético: GOL C$ 8, DEF C$ 7, MEI C$ 9, ATA C$ 12):

| Formação | Custo médio |
|---|--:|
| 4-3-3 | C$ 99 |
| 4-4-2 | C$ 96 |
| 3-5-2 | C$ 98 |

**Decisão: manter neutra**, como no Cartola. Bônus por formação acrescenta regra e desequilibra o jogo. Como o preço deriva da média de pontos (`3 + média`), o valor por cartoleta tende a se igualar entre posições, e isso equilibra as formações.

- [ ] **Checar no beta:** pontos médios por formação e % de uso. Se uma formação for escolhida por > 60% **e** pontuar claramente mais, recalibrar por posição (coeficiente de preço ou peso de scout), e não criar bônus de formação.

## Desempate no ranking

1. Maior pontuação na rodada
2. Mais gols dos jogadores escalados
3. Menor custo do time
4. Quem salvou o time primeiro

---

*Criado em 28/09/2026. Pesos inspirados no padrão que o público já conhece; são proposta de produto.*
