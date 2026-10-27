---
titulo: Custos e Monetização
tipo: negocio
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/negocio
---

# Custos e Monetização

← [[Index]] · Decisão que libera esta fase: [[Plano de Validação]]

> [!warning] Todos os valores são estimativas de mercado (28/09/2026), não cotações.

## Fase de validação (sem prêmio)

| Item | Custo |
|---|--:|
| Vercel, Supabase, PostHog (planos grátis) | R$ 0 |
| API-Football Free | R$ 0 |
| Domínio | ~R$ 40 |
| **Total** | **~R$ 40** (+ ~R$ 105/mês se precisar do plano Pro da API) |

O desenvolvimento é o seu tempo: solo, em noites e fins de semana, ~2 semanas até o beta.

## Passes de rodada (decidido em 27/10/2026)

Escalar exige um passe de rodada. Ver [[2026-10-27 — Passes de rodada pagos]].

| Produto | Preço | Por rodada |
|---|--:|--:|
| Passe avulso | R$ 4,99 | R$ 4,99 |
| Pacote com 5 passes | R$ 19,99 | R$ 4,00 |

- 2 passes de cortesia no onboarding. Validade: temporada da compra e a seguinte.
- Somente PIX; nota fiscal emitida manualmente por enquanto. A taxa do provedor PIX entra no custo de cada venda.
- **A receita dos passes nunca forma prêmio.** Ela é receita do produto, como uma assinatura.

## Fase 2 pós-validação — hipótese interna e não pública

> [!danger] Não aprovada para implementação ou comunicação
> A hipótese abaixo é exclusivamente de planejamento. Não deve aparecer em telas, materiais de aquisição, termos, regulamento ou qualquer comunicação ao público. O produto permanece sem prêmio em dinheiro; o único pagamento é o passe de rodada, que não financia prêmio.

**Hipótese a avaliar após a validação:** cada participante de uma liga contribuiria com **R$ 5 por PIX a cada rodada**, e a pessoa com a maior pontuação na rodada receberia o valor formado pelas contribuições do grupo.

Essa mecânica **não está liberada**: ela vincula o prêmio ao número de participantes e ao valor arrecadado. Isso é incompatível com a condição de fantasy sport prevista no art. 49 da Lei 14.790/2023, que exige premiação garantida independente desses fatores. Ver [[Jurídico e Riscos]].

Antes de qualquer decisão de produto, contratar parecer jurídico especializado e revisar modelo operacional, tributação, KYC/idade, prevenção a fraude e os requisitos do provedor de pagamentos. Não criar fluxo de cobrança, carteira ou distribuição de prêmio com base nesta hipótese. O fluxo PIX dos passes de rodada é separado e nunca pode ser reaproveitado para prêmio.

## Fontes de receita (sem apostas)

| Fonte | Quanto rende | Público necessário |
|---|---|---|
| **Patrocínio da rodada** ("Rodada 29 oferecida por…") | R$ 1–3 mil por rodada | Pouco. Pode financiar uma premiação fixa, se juridicamente viável. |
| **Passes de rodada** | R$ 4,00–4,99 por rodada por usuário | Decidido em 27/10/2026 |
| **Assinatura PRO** | ~R$ 9,90/mês | ~500 assinantes cobrem o ano |
| **Anúncios** | R$ 5–20 por mil visualizações de página | 300–500 mil visualizações/mês |
| **Ligas pagas** (empresas) | Taxa por liga | Nicho fiel |
| ~~Afiliado de bets~~ | Alto | **Evitar**: regras de publicidade de apostas e conflito com o emprego |

**Ponto de equilíbrio:** depende do modelo pós-validação que obtiver aprovação jurídica e operacional.
- **Patrocínio:** 2 patrocinadores de R$ 2,5 mil/mês, **ou**
- **PRO:** ~500 assinantes, **ou**
- **Combinado:** 1 patrocinador + ~250 assinantes.

---

*Criado em 28/09/2026. Atualizado em 30/09/2026.*
