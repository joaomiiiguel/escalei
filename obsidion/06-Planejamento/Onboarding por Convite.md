---
titulo: Onboarding por Convite
tipo: planejamento
projeto: Fantasy Futebol
criado-em: 2026-09-29
tags:
  - projeto/fantasy-futebol
  - area/produto
  - area/design
---

# Onboarding por Convite

← [[Index]] · Fluxo: [[Fluxo de Telas]] · Dados: [[Banco de Dados — Modelo e Campos]] · Métricas: [[Plano de Validação]]

## Decisão

O beta fechado só aceita novos participantes por um link de convite de liga válido. Não há cadastro aberto nem criação de liga no primeiro acesso. A pessoa entra sabendo quem a convidou e para qual grupo vai jogar; isso torna a liga o contexto inicial do produto e permite medir a viralidade desde a aquisição.

O convite continua sendo o mecanismo de entrada, não uma autenticação: depois de validá-lo, a pessoa entra com telefone e OTP por SMS. O vínculo à liga só é criado após concluir o perfil e aceitar os termos.

## Caminho feliz

```text
Link /convite/[codigo]
  → validar código e mostrar a liga + quem convidou
  → informar telefone e validar OTP por SMS
  → criar perfil (apelido, clube opcional, termos)
  → entrar automaticamente na liga
  → montar o primeiro time
  → confirmação: membro da liga e convite para chamar amigos
```

## Regras de produto

- Link inválido, expirado, liga arquivada ou temporada diferente: não liberar cadastro; explicar o problema e oferecer apenas contato com quem enviou o convite.
- Visitante sem código em `/entrar`, `/cadastro` ou rota privada: direcionar para uma tela pública curta de acesso por convite; não exibir Google nem e-mail nela.
- Quem já tem conta e abre um convite válido autentica-se, entra na liga se ainda não for membro e segue para a liga. Se já for membro, vai para a tela da liga sem duplicar registro.
- A criação da associação usa `fn_entrar_liga(codigo)` no servidor após identidade confirmada; a RPC registra `ligas_membros.convidado_por`.
- Persistir o código de convite com segurança durante o envio e a validação do OTP por SMS. O código não é uma prova de identidade.
- Não revelar lista de membros ou detalhes privados antes da autenticação. Na prévia, mostrar só nome e ícone da liga, apelido do convidador e a temporada.
- Após entrar, registrar `convite_aceito`; o evento `cadastro` inclui a origem de convite. O compartilhamento posterior registra `convite_enviado { canal }`.
- Convites devem usar URL não adivinhável além do código curto atual, ou ter expiração/revogação antes da abertura para público amplo. Esta é uma pendência técnica de segurança a decidir antes da implementação de produção.

## Telas do protótipo

1. **Convite recebido**: "Marcos convidou você para a liga Resenha do Trabalho", resumo "12 amigos · Rodada 29", explicação de três passos e CTA "Entrar na liga".
2. **Identificação**: campo de celular brasileiro e envio de OTP por SMS; selo persistente da liga convidante e link "Usar outro convite".
3. **Completar perfil**: apelido, clube do coração opcional, aceite obrigatório dos termos e CTA "Entrar na Resenha".
4. **Sucesso**: confirmação de entrada na liga, ranking inicial sem dados e CTA dominante "Escalar meu time".
5. **Acesso não disponível**: convite inválido/expirado, sem campos de login e orientação para pedir um novo link.

## Critérios de aceite

- Uma pessoa sem convite não consegue iniciar autenticação nem concluir perfil.
- Um convite válido sobrevive ao envio e à validação do OTP por SMS.
- Uma pessoa entra na liga uma única vez, com `convidado_por` correto.
- Convite inválido, arquivado, expirado e de outra temporada não criam perfil nem associação.
- O fluxo é mobile em 390×844, acessível e sem referência a prêmio, aposta, saldo ou odds.
- O funil permite calcular convite → cadastro → primeira escalação e convites aceitos por usuário.

## Task

- [ ] **ONB-01 · Implementar onboarding exclusivo por convite** — criar a prévia de convite, bloquear o acesso direto ao cadastro, preservar o código durante o OTP por SMS, associar a liga no servidor de forma idempotente e instrumentar os eventos `cadastro` e `convite_aceito`. Dependências: schema/RPC de ligas e autenticação Supabase. Protótipo: `escalei.pen`.

---

*Planejado em 29/09/2026.*
