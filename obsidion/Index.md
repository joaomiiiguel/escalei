---
titulo: Fantasy Futebol — Índice
tipo: indice
projeto: Fantasy Futebol
status: pre-validacao
criado-em: 2026-09-28
atualizado-em: 2026-09-30
tags:
  - projeto/fantasy-futebol
  - indice
---

# Fantasy Futebol — Índice

> [!abstract] Em uma frase
> **App mobile (PWA) de fantasy futebol gratuito no MVP** para o Brasileirão Série A, estilo Cartola, criado como **projeto pessoal**. O MVP não tem apostas, prêmio em dinheiro nem pagamento. O primeiro objetivo é **validar se as pessoas voltam toda rodada** e convidam amigos, com custo estimado de ~R$ 40.

> [!important] Status em 28/09/2026
> **Pré-validação.** Nada foi construído. Plano: beta em 17–19/10 e **lançamento do teste em 24–26/10** ([[Plano de 1 Mês — Lançamento do Teste]]). Próximo passo: criar a chave grátis da API-Football e rodar as 3 chamadas de verificação da cobertura da Série A 2026 (ver [[API-Football]]).

---

## Mapa

**Produto**
- [[Visão e Tese]]: o problema, a hipótese, concorrência e posicionamento
- [[Regras do Jogo]]: formato, posições, orçamento, preço, **formação × valor**, trava e **tabela de pontuação**
- [[Fluxo de Telas]]: as 15 telas do MVP e a navegação
- [[Prompt de Design]]: prompt pronto para a IA de design (somente mobile)

**Técnico**
- [[API-Football]]: plano grátis, endpoints, campos, orçamento de requisições e verificação
- [[Arquitetura]]: stack, jobs, estrutura do projeto e decisões técnicas
- [[Banco de Dados — Modelo e Campos]]: **17 tabelas com todos os campos**, tipos, origem na API, regras, RLS, volume e LGPD

**Validação**
- [[Plano de Validação]]: hipóteses, métricas com meta, decisão, recrutamento e eventos

**Negócio**
- [[Custos e Monetização]]: custo da validação, hipótese interna pós-validação, fontes de receita e ponto de equilíbrio

**Jurídico e riscos**
- [[Jurídico e Riscos]]: art. 49 da Lei 14.790, CNPJ, LGPD, antifraude, imagem e marca, **conflito com o emprego**

**Planejamento**
- **[[Plano de 1 Mês — Lançamento do Teste]]**: semana a semana até o lançamento em 24–26/10, com horas, checkpoints e checklist
- [[Roadmap e Backlog]]: fases, backlog com checklists e cronograma
- [[Onboarding por Convite]]: fluxo de acesso exclusivo por convite e task ONB-01

**Decisões**
- [[Origem do projeto e decisões iniciais]]

**Referências**
- `Anexos/Benchmark/`: 9 telas de FanDuel e DraftKings (App Store US), uso interno

---

## Como escrever aqui

1. **Date o que é perecível.** Preço de API, calendário do Brasileirão, número de usuários.
2. **Diga de onde veio o fato.** Verificado na API, pesquisado na web ou premissa. Premissa sempre marcada como premissa.
3. **Decisão nova vira nota datada** em `07-Decisoes/`, com o porquê.

---

*Criado em 28/09/2026.*
