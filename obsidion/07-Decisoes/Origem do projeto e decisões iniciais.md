---
titulo: 2026-09-28 — Origem do projeto e decisões iniciais
tipo: decisao
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - registro/decisao
---

# 2026-09-28 — Origem do projeto e decisões iniciais

← [[Index]]

## Como a ideia evoluiu

1. **25/09:** a ideia nasceu como possível produto dentro de uma plataforma de apostas, para atrair usuários ao sportsbook com odds durante os jogos.
2. **28/09:** a análise de custo mostrou que, nesse formato, o fantasy só se pagava com escala (dezenas de milhares de participantes por rodada).
3. **28/09:** **virou projeto pessoal, independente e sem apostas.** O investimento seria só no prêmio por rodada.
4. **28/09:** antes de gastar com prêmio, **validar sem prêmio**, usando a **API-Football grátis e sem parcial ao vivo**.

## Decisões

| Decisão | Motivo |
|---|---|
| Sem apostas e sem odds | Projeto pessoal; evita as regras de publicidade de apostas e o conflito com o emprego |
| Validar sem prêmio | Custa ~R$ 40 em vez de ~R$ 60 mil; mede retenção pura |
| API-Football grátis, sem parcial ao vivo | 100 requisições/dia bastam para pontuar por jogo encerrado (~45 no pior dia) |
| Posições GOL/DEF/MEI/ATA | A API não separa zagueiro de lateral |
| Formação neutra: sem bônus nem multiplicador | Cartola faz assim; o preço (`3 + média`) já iguala o valor por cartoleta entre posições. Desequilíbrio se corrige por posição, não por formação |
| Camisa genérica + sigla, sem foto e sem escudo | Direito de imagem e marca |
| Somente mobile (PWA) | Público joga pelo celular; menos telas |
| Next.js + Supabase + PostHog (grátis) | Custo zero; login, banco, jobs e métricas prontos |
| Ligas privadas no MVP | Principal alavanca de retenção e crescimento; testa a H2 |
| Fake door do PRO | Mede disposição de pagar sem construir pagamento |

## Descartado (por ora)

- Parcial ao vivo, push, prêmio, CPF, PIX, capitão, técnico, Modo Rápido, desktop
- Afiliado de bets como receita

---

*Registrado em 28/09/2026.*
