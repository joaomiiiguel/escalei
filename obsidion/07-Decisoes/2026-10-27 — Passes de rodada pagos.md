---
titulo: 2026-10-27 — Passes de rodada pagos
tipo: decisao
projeto: Fantasy Futebol
criado-em: 2026-10-27
tags:
  - projeto/fantasy-futebol
  - registro/decisao
  - area/negocio
---

# 2026-10-27 — Passes de rodada pagos

← [[Index]] · Relacionado: [[Custos e Monetização]] · [[Jurídico e Riscos]] · [[Regras do Jogo]]

> [!abstract] Resumo
> Escalar passa a exigir um **passe de rodada**, comprado por PIX: **R$ 4,99** o avulso ou **R$ 19,99** o pacote com 5. Todo usuário novo ganha **2 passes de cortesia**. O dinheiro dos passes **nunca** forma prêmio. Substitui a premissa "MVP gratuito, sem pagamento" de [[Origem do projeto e decisões iniciais]].

## Por que não "plano mensal"

O Brasileirão tem 38 rodadas em cerca de 8 a 9 meses: a média é de 4 a 5 por mês, mas meses com rodada no meio da semana chegam a 6 ou 7 e meses com data FIFA ficam com 2 ou 3. Um plano por mês de calendário entregaria valor diferente a cada mês. Por isso o pacote é **por quantidade de rodadas**.

## Decisões

| Decisão | Detalhe |
|---|---|
| Nome no produto | **Passe de rodada**. Não usar "crédito" nem "saldo", que já designam o saldo em C$ do jogo. |
| Preços | Avulso **R$ 4,99** (1 passe). Pacote **R$ 19,99** (5 passes, R$ 4,00 cada, ~20% de desconto). Valores guardados em centavos. |
| Validade | Temporada da compra **e a seguinte**. O consumo usa primeiro o passe que vence antes. |
| Escopo do passe | **Um passe por usuário e rodada.** A escalação pontua em **todos** os grupos de que a pessoa participa. Não há cobrança por grupo. |
| Momento do consumo | Na **trava** da rodada, não ao salvar. Editar várias vezes gasta um passe; comprar e não escalar não gasta nada. |
| Sem passe | O mercado continua aberto para consulta, mas não é possível salvar. No ranking, a rodada soma 0 como já acontece sem escalação. |
| Rodada cancelada por inteiro | O passe volta ao usuário. |
| Cortesia | **2 passes** ao concluir o onboarding, com a mesma validade. |
| Administradores | Isentos: não disputam ranking (JOA-142). |
| Pagamento | **Somente PIX** por enquanto, confirmado por webhook do provedor. O retorno do navegador nunca credita passe. |
| Nota fiscal | Emitida **manualmente** por enquanto, com controle no painel admin. |
| Prêmio | **Nenhum.** O valor arrecadado nunca forma nem financia prêmio (art. 49, parágrafo único, III, da Lei 14.790/2023). |

## Ativação

A exigência do passe fica atrás da chave `passes_obrigatorios` em `configuracoes`, que nasce desligada (JOA-152). Com ela desligada, salvar não exige passe e a trava não consome nada; quem tinha conta recebeu as 2 cortesias, que ficam guardadas. Ligar só depois que a compra por PIX estiver no ar, senão ninguém consegue repor passes.

## Pendências

- [ ] Escolher o provedor PIX com cobrança dinâmica e webhook (conta PF ou CNPJ, taxa por transação).
- [ ] Atualizar termos de uso no lançamento da compra: preço, validade, expiração e arrependimento de 7 dias para passes não usados (CDC, art. 49).
- [ ] Confirmar com o contador a emissão manual de nota e o enquadramento da receita.

## Implementação (Linear)

- JOA-151 · Schema de passes: produtos, pedidos e lotes com RLS
- JOA-152 · Exigir passe para escalar e consumir na trava da rodada
- JOA-153 · Pagamento via PIX com webhook idempotente
- JOA-154 · UI de passes: compra, saldo e aviso de cortesia
- JOA-155 · Admin de pedidos: nota manual, cortesias e estornos

---

*Criado em 27/10/2026.*
