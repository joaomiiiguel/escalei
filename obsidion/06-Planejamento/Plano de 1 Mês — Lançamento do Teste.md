---
titulo: Plano de 1 Mês — Lançamento do Teste
tipo: planejamento
projeto: Fantasy Futebol
periodo: 2026-09-29 → 2026-10-28
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/planejamento
---

# Plano de 1 Mês — Lançamento do Teste

← [[Index]] · Backlog completo: [[Roadmap e Backlog]] · O que medir: [[Plano de Validação]]

> [!abstract] Em uma frase
> **4 semanas, ~80 horas (≈ 20 h/semana em noites e fins de semana), R$ 40.** Beta fechado na rodada de **17–19/10** e **lançamento do teste na rodada de 24–26/10**. Depois disso a validação corre sozinha por 4–6 rodadas.

> [!warning] Premissas a confirmar no dia 1
> - **Calendário:** as datas das rodadas do Brasileirão 2026 precisam ser conferidas na tabela da CBF. O plano ancora o beta e o lançamento nos **fins de semana de 17–19/10 e 24–26/10**. Se houver rodada no meio da semana, o beta pode ser antecipado.
> - **Capacidade:** ~20 h/semana. Com menos, cortar a lista "Pode ficar para depois" antes de atrasar a data.
> - **API:** se o plano grátis não cobrir a temporada 2026, pagar o Pro por 1 mês (US$ 19) **no mesmo dia**, sem replanejar.

---

## Visão das 4 semanas

| Semana | Tema | Entrega verificável no domingo |
|---|---|---|
| **S1 · 29/09–05/10** | Verificar e fundar | API confirmada, banco criado, design pronto, app vazio no ar |
| **S2 · 06/10–12/10** | Dados e montar time | Elencos e jogos reais no banco; dá para **montar e salvar um time** |
| **S3 · 13/10–19/10** | Pontuação, ranking, ligas + **beta** | Rodada passada pontuada certo; **beta com 20–30 amigos** na rodada do fim de semana |
| **S4 · 20/10–26/10** | Acabamento + **lançamento** | Correções do beta, métricas ligadas, **teste aberto na rodada de 24–26/10** |
| 27–28/10 | Retrospectiva | Primeiros números e ajustes |

---

## Semana 1 · 29/09 – 05/10 · Verificar e fundar (~20 h)

| Tarefa                                                                         | Horas | Feito quando                                            |
| ------------------------------------------------------------------------------ | ----: | ------------------------------------------------------- |
| Ler o contrato de trabalho (exclusividade, não-concorrência, PI)               |     1 | Dúvida anotada ou resolvida em [[Jurídico e Riscos]]    |
| Conferir o calendário da CBF e marcar as datas de beta e lançamento            |   0,5 | Datas fixadas nesta nota                                |
| Criar a chave grátis da API-Football e rodar as 3 chamadas                     |     1 | Checklist de [[API-Football]] marcado                   |
| Salvar as respostas reais (liga, jogo, jogadores, lesões) em `tests/fixtures/` |   0,5 | Arquivos no repo                                        |
| Nome do app + domínio                                                          |     1 | Domínio registrado                                      |
| Gerar o design com o [[Prompt de Design]] e escolher o visual                  |     4 | Componentes + 6 telas principais aprovados              |
| Projeto Next.js + Supabase + Vercel + PostHog                                  |     3 | Página "em breve" no domínio                            |
| Migrations: enums, tabelas, índices, RLS                                       |     6 | Schema de [[Banco de Dados — Modelo e Campos]] aplicado |
| Seed: 20 clubes com sigla e cores, `tabela_pontuacao` v1, `configuracoes`      |     1 | Seed roda do zero                                       |
| Cliente da API-Football com controle de cota (`sync_execucoes`)                |     2 | Uma chamada real gravada no log com a cota restante     |

> [!check] Checkpoint de domingo 05/10
> API validada para 2026 · banco criado · design escolhido · deploy funcionando. **Se a API não servir, a decisão (Pro ou Sportmonks) sai aqui.**

---

## Semana 2 · 06/10 – 12/10 · Dados e montar time (~22 h)

| Tarefa | Horas | Feito quando |
|---|--:|---|
| Job `sync-elencos` (20 times) | 2 | ~600 jogadores no banco |
| Job `sync-lesoes` | 1 | Status preenchido |
| Job `sync-rodada` (jogos, status, `trava_em`) | 2 | Rodada atual com os 10 jogos |
| Preço inicial pelo histórico da temporada (`preco.ts`) | 2 | Preços entre C$ 2 e 20, com time de craques estourando C$ 100 |
| Cadastro: telefone + OTP por SMS, apelido, clube do coração, aceite dos termos | 3 | Conta criada de ponta a ponta |
| Tela Início (rodada, contagem, jogos, card "Meu time") | 3 | Dados reais na tela |
| **Montar Time + Mercado** (filtros, busca, orçamento, formação) | 7 | Time salvo no banco |
| Triggers de validação (formação, orçamento) e de trava | 2 | Salvar depois da trava falha |

> [!check] Checkpoint de domingo 12/10
> Qualquer pessoa com o link cria conta e **salva um time válido** com jogadores reais.

---

## Semana 3 · 13/10 – 19/10 · Pontuação, ranking, ligas e beta (~22 h)

| Tarefa | Horas | Feito quando |
|---|--:|---|
| `pontuacao.ts` + `fn_pontuar_jogo`, com testes contra as respostas gravadas | 5 | Pontos de um jogo real batem com a conta à mão |
| Jobs `pontuar-jogo`, `conferir-rodada`, `abrir-rodada` | 5 | Rodada passada simulada do início ao fechamento |
| Tela Meu Time na Rodada (pontos × "aguardando") | 3 | Chips mudam conforme os jogos encerram |
| Ranking geral + ranking da liga (`ranking_rodada`) | 3 | Posição e ▲/▼ corretos |
| Ligas: criar, link de convite, WhatsApp, entrar por código | 3 | Convite de ponta a ponta com 2 contas |
| Teste de ponta a ponta com rodada passada + deploy | 3 | Checklist de beta ok |
| **Convidar 20–30 amigos para o beta** (fora do trabalho) | — | Até quarta 15/10 |

> [!check] Beta na rodada de 17–19/10
> Os amigos escalam até a trava. Acompanhar os jobs **ao vivo** no primeiro dia de jogo, conferir a pontuação de 2–3 jogos contra a súmula e anotar os bugs.

**Recrutamento em paralelo:** conversar com **10–15 "capitães"**, pessoas que puxam grupos de WhatsApp, para cada um criar uma liga no lançamento.

---

## Semana 4 · 20/10 – 26/10 · Acabamento e lançamento (~18 h)

| Tarefa | Horas | Feito quando |
|---|--:|---|
| Correções do beta | 5 | Nenhum bug de pontuação ou de trava aberto |
| Calibrar os coeficientes de preço com os dados do beta e checar o equilíbrio entre formações | 1 | Distribuição de preços revisada; nenhuma formação dominante (ver [[Regras do Jogo]]) |
| Eventos do PostHog + painéis (funil, retenção por rodada, convites) | 2 | Painéis mostrando os dados do beta |
| Tela Seja PRO (fake door) + Pesquisa (bottom sheet) | 2 | Clique gravado em `interesse_pro` |
| Fim de Rodada compartilhável | 2 | Imagem/link compartilhável no WhatsApp |
| E-mails: rodada aberta e lembrete de trava | 2 | E-mail chegando |
| Termos de uso, privacidade e regulamento (versão simples) | 2 | Páginas publicadas |
| Kit do capitão: mensagem pronta + link da liga | 1 | Enviado aos capitães até quinta 23/10 |
| Checklist de lançamento (abaixo) | 1 | Tudo marcado até sexta 24/10 |

### Checklist de lançamento (até sexta 24/10)

- [ ] Rodada de 24–26/10 **aberta**, com `trava_em` certo
- [ ] Os 20 elencos atualizados na semana, lesões do dia
- [ ] Cota da API: reserva configurada, log sem erro nos últimos 3 dias
- [ ] Teste com conta nova: cadastro → time → liga → convite
- [ ] Exclusão de conta funcionando
- [ ] Painéis do PostHog recebendo eventos
- [ ] Mensagem de "pontuação atrasada" testada (API fora)
- [ ] Capitães com o kit em mãos
- [ ] Backup: comando para recalcular uma rodada a partir do `payload_api`

> [!success] Lançamento: rodada de 24–26/10
> Capitães disparam os convites na **sexta 24/10**. Meta da 1ª rodada: **150+ times escalados**.

---

## 27–28/10 · Retrospectiva

- Números da 1ª rodada: cadastros, % que escalou, tempo de montagem, convites aceitos
- Bugs e reclamações
- Ajustes para a rodada seguinte
- A validação continua por **mais 3–5 rodadas** (até ~final de novembro), com as pesquisas depois da 2ª e da 4ª rodada, e decisão em dezembro (ver [[Plano de Validação]])

---

## Escopo do mês

| Tem de ter (o teste não sai sem) | Deveria ter | Pode ficar para depois |
|---|---|---|
| Cadastro, Início, Montar Time, Mercado, trava | Fim de Rodada compartilhável | Ranking por clube do coração |
| Pontuação por jogo encerrado + fechamento | Seja PRO (fake door) | Tema claro |
| Meu Time na Rodada | Pesquisa | Escalação automática |
| Ranking geral + ligas com convite | E-mails de rodada e trava | Instalar como app (PWA) |
| Jobs com controle de cota | | Variação de preço por rodada (preço fixo no início) |
| Eventos de métrica | | Detalhe do jogador com os últimos 5 jogos |
| Termos e privacidade | | |

**Regra de corte:** se o checkpoint de uma semana não fechar, a coluna "Pode ficar para depois" sai inteira **antes** de mexer na data do lançamento. Só se isso não bastar entra a coluna "Deveria ter".

---

## Riscos do mês

| Risco | Sinal | Resposta |
|---|---|---|
| Plano grátis sem a temporada 2026 | Chamada de verificação vazia ou bloqueada | Pro por 1 mês (US$ 19), no mesmo dia |
| Scout errado ou atrasado | Diferença contra a súmula no beta | Recalcular pelo `payload_api`; se persistir, avaliar a Sportmonks |
| Atraso na construção | Checkpoint de domingo não fecha | Aplicar a regra de corte |
| Pouca gente no lançamento | < 50 times na 1ª rodada | Mais capitães; adiar a leitura das métricas em 1 rodada |
| Calendário | Rodada remarcada | Mover beta/lançamento para a rodada seguinte; o plano não depende de uma data específica |

---

*Criado em 28/09/2026. Datas estimadas: confirmar o calendário da CBF na S1 e atualizar esta nota em cada checkpoint.*
