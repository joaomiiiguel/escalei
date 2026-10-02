---
titulo: Roadmap e Backlog
tipo: planejamento
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/planejamento
---

# Roadmap e Backlog

← [[Index]]

> [!warning] Calendário
> Em 28/09/2026 o Brasileirão 2026 está por volta da rodada 28 de 38. Construindo em ~2 semanas, sobram **~8 rodadas**: dá para o beta mais 4–6 rodadas de validação. **Confirmar as datas na tabela da CBF.** Se atrasar, a validação passa para o início da Série A 2027.

> [!tip] Execução do mês
> O detalhamento semana a semana está em [[Plano de 1 Mês — Lançamento do Teste]].

## Fases

| Fase | Período (estimado) | Saída |
|---|---|---|
| **0 · Verificação** | 29/09 – 01/10 | API-Football confirmada para a Série A 2026 no plano grátis; contrato de trabalho lido |
| **1 · Construção** | 29/09 – 19/10 | MVP no ar |
| **2 · Beta fechado** | rodada de 17–19/10 | Bugs corrigidos; coeficientes de preço calibrados |
| **3 · Validação** | lançamento em 24–26/10 + 4–6 rodadas (até ~fim de nov) | Métricas do [[Plano de Validação]] |
| **4 · Decisão** | 1 semana após a última rodada | Seguir / ajustar / parar |

## Backlog

### Fase 0 · Verificação
- [ ] Ler o contrato de trabalho (ver [[Jurídico e Riscos]])
- [ ] Criar a conta e a chave grátis da API-Football
- [ ] Rodar as 3 chamadas de verificação e marcar o checklist em [[API-Football]]
- [ ] Salvar as respostas reais (liga, jogo, jogadores) para usar nos testes
- [ ] Escolher o nome do app e registrar o domínio
- [ ] Gerar o design com o [[Prompt de Design]]

### Fase 1 · Construção
**Base**
- [ ] Projeto Next.js + Supabase + PostHog, deploy na Vercel
- [ ] Migrations: enums, 17 tabelas, índices ([[Banco de Dados — Modelo e Campos]])
- [ ] RLS de todas as tabelas
- [ ] Seed: 20 clubes com sigla e cores, `tabela_pontuacao` v1, `configuracoes`

**Dados**
- [ ] Cliente da API-Football com controle de cota (`sync_execucoes`)
- [ ] Jobs `sync-elencos`, `sync-lesoes`, `sync-rodada`
- [ ] `pontuacao.ts` + `fn_pontuar_jogo`, com teste contra resposta real gravada
- [ ] Job `pontuar-jogo` (disparado no `ENCERRADO`)
- [ ] `preco.ts` + preço inicial a partir do histórico da temporada
- [ ] Jobs `conferir-rodada`, `abrir-rodada` e `fn_atualizar_precos`

**App**
- [ ] Cadastro (telefone + OTP por SMS), apelido, clube do coração, aceite dos termos
- [ ] ONB-01: onboarding exclusivo por convite de liga (ver [[Onboarding por Convite]])
- [ ] Início
- [ ] Montar Time + Mercado + Detalhe do Jogador + escalação automática
- [ ] Trigger de trava e de validação de formação/orçamento
- [ ] Meu Time na Rodada
- [ ] Ranking (geral, ligas, clube) com `ranking_rodada`
- [ ] Ligas: criar, convidar (link + WhatsApp), entrar por código
- [ ] Fim de Rodada compartilhável
- [ ] Seja PRO (fake door), Pesquisa, Como Funciona, Perfil com exclusão de conta
- [ ] PWA (manifest, ícones, instalar)
- [ ] E-mails: rodada aberta, lembrete de trava
- [ ] Eventos do PostHog e painéis

**Publicação**
- [ ] Termos de uso, privacidade e regulamento (versão simples)
- [ ] Teste de ponta a ponta numa rodada passada, com as respostas gravadas

### Depois da validação (só se passar)
- [ ] Parcial ao vivo (API Pro)
- [ ] Push notifications
- [ ] Prêmio: CNPJ, antifraude, pagamento PIX, IR
- [ ] Patrocínio da rodada
- [ ] PRO de verdade
- [ ] Modo Rápido (Tiers), capitão, mais ligas (Série B, estaduais)

---

*Criado em 28/09/2026. Datas estimadas; atualizar a cada fase.*
