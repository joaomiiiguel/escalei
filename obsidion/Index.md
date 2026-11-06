---
titulo: Fantasy Futebol — Índice
tipo: indice
projeto: Fantasy Futebol
status: em-validacao
criado-em: 2026-09-28
atualizado-em: 2026-11-06
tags:
  - projeto/fantasy-futebol
  - indice
---

# Fantasy Futebol — Índice

> [!abstract] Em uma frase
> **Escalou**: app mobile (PWA) de fantasy futebol para o Brasileirão Série A, criado como **projeto pessoal**. Não tem apostas nem prêmio em dinheiro. Escalar vai exigir um **passe de rodada** pago por PIX, com 2 passes de cortesia (ver [[2026-10-27 — Passes de rodada pagos]]); por enquanto a exigência está desligada e o teste é grátis. O objetivo é **validar se as pessoas voltam toda rodada** e jogam com os amigos.

> [!important] Status em 06/11/2026
> **No ar e em validação.** Desde 27/10 o app roda o **Brasileirão 2026 real**, a partir da rodada 33 ([[2026-10-27 — Virada para o Brasileirão 2026]]). Entrada por lista de espera e convite de grupo; login com Google. Pendentes principais: compra de passes por PIX (JOA-153 a JOA-155), painéis do PostHog e a decisão sobre o uso de escudos (ver [[Jurídico e Riscos]]).

---

## Mapa

**Produto**
- [[Visão e Tese]]: o problema, a hipótese, concorrência e posicionamento
- [[Regras do Jogo]]: formato, posições, saldo, preço, passe, trava, escalação tardia e **tabela de pontuação**
- [[Fluxo de Telas]]: as telas que existem hoje e o que ficou só no plano
- [[Identidade Visual]]: cores, tipografia e peças do placar e da prancheta
- [[Landing e Lista de Espera]]: página pública e entrada no beta
- [[Prompt de Design]]: prompt original de setembro (histórico)

**Técnico**
- [[Arquitetura]]: stack, jobs, estrutura do projeto e decisões técnicas
- [[API-Football]]: plano, endpoints em uso, consumo e verificação
- [[Ativação de Produção — Calendário e Orquestração]]: calendário oficial e orquestrador em produção
- [[Pontuacao]]: fluxo de pontuação dos jogos
- [[Orquestrador da Rodada Simulada]]: simulação de 2024 (pausada)
- [[Banco de Dados — Modelo e Campos]]: **28 tabelas**, campos, regras, RLS, volume e LGPD

**Validação**
- [[Plano de Validação]]: hipóteses, métricas com meta, decisão, recrutamento e eventos

**Negócio**
- [[Custos e Monetização]]: custo da validação, passes de rodada, hipótese pós-validação e ponto de equilíbrio

**Decisões**
- [[Origem do projeto e decisões iniciais]]
- [[2026-10-27 — Passes de rodada pagos]]: R$ 4,99 avulso, R$ 19,99 o pacote com 5, PIX, 2 passes de cortesia
- [[2026-10-27 — Virada para o Brasileirão 2026]]: fim da simulação, saldos em C$ 60, estreia na rodada 33
- [[2026-11-02 — Avisos da rodada por push]]: mercado aberto, 1 h para fechar, escalação tardia, mercado fechado e rodada encerrada

**Jurídico e riscos**
- [[Jurídico e Riscos]]: art. 49 da Lei 14.790, CNPJ, LGPD, antifraude, imagem e marca, **conflito com o emprego**

**Planejamento**
- [[Roadmap e Backlog]]: fases e backlog conferido contra o código
- [[Onboarding por Convite]]: lista de espera, e-mails autorizados e entrada no grupo
- [[Plano de 1 Mês — Lançamento do Teste]]: plano de setembro (histórico)

**Marketing**
- [[brand-profile]] · [[Instagram — Perfil e Lançamento]] · [[Primeiros 9 posts]] · [[Roteiros dos Reels]]

**Referências**
- `Anexos/Benchmark/`: 9 telas de FanDuel e DraftKings (App Store US), uso interno

---

## Como escrever aqui

1. **Date o que é perecível.** Preço de API, calendário do Brasileirão, número de usuários.
2. **Diga de onde veio o fato.** Verificado na API, conferido no código, pesquisado na web ou premissa. Premissa sempre marcada como premissa.
3. **Decisão nova vira nota datada** em `07-Decisoes/`, com o porquê.
4. **Mudou o código, confira a nota.** Banco, jobs e telas mudam rápido; a última conferência completa foi em 06/11/2026.

---

*Criado em 28/09/2026. Atualizado em 06/11/2026.*
