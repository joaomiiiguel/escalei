---
titulo: Plano de Validação
tipo: plano-de-validacao
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/validacao
---

# Plano de Validação

← [[Index]] · Tese: [[Visão e Tese]] · Cronograma: [[Roadmap e Backlog]]

> [!abstract] Em uma frase
> **4 a 6 rodadas, 200 a 500 pessoas, sem prêmio, ~R$ 40.** A pergunta principal é se as pessoas voltam toda rodada sem ganhar nada.

## Métricas e metas

| Hipótese | Métrica | Meta | Fonte |
|---|---|---|---|
| Ativação | % dos cadastrados que escalam na 1ª rodada | ≥ 60% | `perfis` × `times` |
| **H1 · Retenção** | % que escalam de novo na rodada seguinte | **≥ 50%** | `times` por coorte |
| **H1 · Retenção** | % ativos depois de 4 rodadas | **≥ 35%** | `times` por coorte |
| Equilíbrio do jogo | % de uso e pontos médios por formação | Nenhuma formação com > 60% de uso **e** pontuação claramente maior | `times.formacao` × `times.pontos` |
| Facilidade | Tempo médio para montar o time | < 3 min | evento `time_escalado` |
| Volta pós-jogo | % dos escalados que abrem o app ≤ 24 h depois de um jogo encerrado | ≥ 50% | evento `pontos_vistos` |
| **H2 · Viralidade** | Convites aceitos por usuário | **≥ 0,5** | `ligas_membros.convidado_por` |
| H2 | % dos usuários em pelo menos 1 liga com 3+ membros | ≥ 40% | `ligas_membros` |
| H3 · Monetização | % dos ativos que clicam em "Seja PRO" | ≥ 5% | `interesse_pro` |
| H3 | "Pagaria R$ 9,90/mês?" = sim | ≥ 10% | `pesquisas_respostas` |
| H3 | Marcas locais com intenção por escrito de patrocinar | ≥ 2 | conversa direta |

## Decisão ao final

| Resultado | Decisão |
|---|---|
| Retenção **e** viralidade passaram | **Seguir:** abrir CNPJ e avaliar modelos de monetização e premiação com parecer jurídico antes de qualquer lançamento (ver [[Custos e Monetização]]) |
| Só a retenção passou | O jogo é bom, falta canal: testar ligas de empresas e grupos antes de investir |
| Retenção no limite | Testar **1 mês de parcial ao vivo** (API Pro, US$ 19) antes de decidir |
| Retenção não passou | Parar ou mudar o formato (rodada rápida, Tiers) |

## Recrutamento (meta: 200–500 pessoas)

1. **Beta fechado (1 rodada):** 20–30 amigos, para achar bugs.
2. **Sementes de liga:** 10–15 "capitães" (alguém que puxa um grupo de WhatsApp), cada um cria uma liga e convida a turma. **É o canal principal**, e é também o que testa a H2.
3. **Canais abertos:** grupos de WhatsApp e Telegram de futebol, r/futebol, X/Twitter nos dias de rodada.

> [!warning] Não recrutar pelo trabalho
> Evitar divulgar para colegas da empresa de apostas ou por canais dela. Ver [[Jurídico e Riscos]].

## Pesquisas

- **Depois da rodada 2:** NPS (0–10), "O que faria você jogar toda rodada?" (opções: prêmio, liga com amigos, estatísticas, notificação, outro), comentário livre.
- **Depois da rodada 4:** NPS, "Pagaria R$ 9,90/mês por: mais times, estatísticas, sem anúncio?", "Jogaria se tivesse prêmio de R$ X?".

## Eventos de métrica (PostHog)

`cadastro` · `time_escalado {segundos, formacao}` · `inicio_visto` · `pontos_vistos {horas_desde_ultimo_jogo}` · `ranking_visto {aba}` · `liga_criada` · `convite_enviado {canal}` · `convite_aceito` · `fim_rodada_compartilhado` · `clique_pro {origem}` · `pesquisa_respondida` · `pwa_instalado` · `conta_excluida`

**Painéis:** funil de cadastro → 1ª escalação; retenção por coorte de rodada; K-fator (convites aceitos por usuário); tempo de montagem.

---

*Criado em 28/09/2026. As metas são referência inicial; revisar depois do beta fechado.*
