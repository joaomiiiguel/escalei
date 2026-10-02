---
titulo: Jurídico e Riscos
tipo: juridico
projeto: Fantasy Futebol
criado-em: 2026-09-28
tags:
  - projeto/fantasy-futebol
  - area/juridico
---

# Jurídico e Riscos

← [[Index]]

> [!warning] Isto não é parecer jurídico
> São os pontos a levar para advogado e contador antes da fase com prêmio.

## 1. Conflito com o emprego (prioridade 1)

O autor trabalha numa empresa de apostas esportivas, e fantasy de futebol é mercado vizinho.
- [ ] Ler o contrato: **exclusividade, não-concorrência, cessão de propriedade intelectual**.
- [ ] Nada da empresa no projeto: **código, infra, contas, dados, horário de trabalho**.
- [ ] Não recrutar usuários pelos canais nem pelos colegas da empresa.
- [ ] Avaliar contar para a empresa (transparência protege, e ela pode virar parceira ou compradora).

## 2. Enquadramento legal do fantasy

- **Art. 49 da Lei 14.790/2023:** fantasy sport não é loteria, promoção comercial nem aposta de quota fixa, e **não precisa de autorização do poder público**, desde que:
  - o time virtual tenha **2+ pessoas reais**;
  - o resultado dependa de **conhecimento, estatística e estratégia**;
  - as **regras sejam preestabelecidas** (por isso a `tabela_pontuacao` é versionada);
  - o **prêmio seja fixo e independa do número de participantes** e do valor arrecadado;
  - o resultado **não venha de uma pessoa só**.
- **Na validação (sem prêmio)** o risco regulatório é praticamente nulo. Ainda assim: termos de uso, política de privacidade e regulamento publicados.
- **PL 2.796/2021 (Marco dos Games):** o trecho de fantasy caiu no Senado. O art. 49 é a norma vigente.

## 3. Hipótese interna de contribuição por rodada (não pública e não aprovada)

O planejamento considera, somente após a validação, uma contribuição de R$ 5 por participante da liga via PIX em cada rodada, com repasse do total ao maior pontuador. **Não comunicar nem implementar esta hipótese.**

Pelo art. 49, parágrafo único, III, da Lei 14.790/2023, a exceção de fantasy sport requer que o valor garantido da premiação seja independente da quantidade de participantes e do volume arrecadado com taxas de inscrição. Portanto, o modelo de repasse do valor arrecadado pelo grupo **não atende a esse requisito na sua formulação atual**. A conclusão jurídica definitiva depende de parecer especializado; até lá, o produto deve permanecer no modelo gratuito do MVP.

Caso exista uma fase futura com premiação juridicamente viável, os itens mínimos de análise são:

- [ ] **CNPJ** (para pagar PIX em escala, reter IR, contratar serviços e ser controlador na LGPD).
- [ ] **IR sobre prêmio:** regra de retenção e informe com o contador.
- [ ] **18+** para receber prêmio.
- [ ] **Antifraude:** fluxos com dinheiro atraem multicontas. Mínimo: CPF único validado, telefone verificado, PIX só para o mesmo CPF, bloqueio de vários cadastros no mesmo aparelho.
- [ ] Confirmar formato de premiação, regulamento e enquadramento antes de qualquer lançamento.

## 4. Imagem, marca e nome

| Elemento | Situação |
|---|---|
| Foto de jogador | **Não usar.** Direito de imagem (CF art. 5º, X; CC art. 20; Súmula 403 do STJ) |
| Escudo | **Não usar.** Marca registrada e símbolo esportivo protegido |
| Nome + estatística | Uso factual no jogo, risco baixo. **Nunca** em peça publicitária (CC art. 18) |
| Cores + sigla | Uso adotado (padrão de FanDuel e DraftKings) |

## 5. Dados e fonte

- **LGPD:** na validação, só e-mail, apelido e clube do coração. Exclusão de conta funcional. Ver [[Banco de Dados — Modelo e Campos]].
- **API-Football:** confirmar que os termos permitem **uso comercial**. Os direitos oficiais de dados para apostas do Brasileirão estão com a Infront, mas isso não afeta um fantasy gratuito sem apostas.

---

*Criado em 28/09/2026. Atualizado em 30/09/2026.*
