# Avisos da rodada por push

**Data:** 02/11/2026

## Decisão

Antecipar as notificações push, antes previstas para depois da validação. Quem permitir no aparelho recebe quatro avisos: mercado aberto, 1 hora para fechar, mercado fechado e rodada encerrada.

A opção **Notificação da rodada**, em `/perfil`, vem ligada por padrão em cada aparelho. O navegador só libera o push depois de um toque, então quem está logado e ainda não permitiu vê um toast flutuante em todo o app. Se dispensar, o toast volta em 14 dias, mas segue aparecendo em `/perfil`. Quem desliga a opção não vê mais o toast naquele aparelho. Não há envio ao grupo do WhatsApp nem painel de avisos no admin.

## Como funciona

- Os avisos ficam em `avisos_whatsapp` e as inscrições, em `push_inscricoes`.
- A Edge Function `notify-whatsapp` roda a cada 2 minutos.
- Um push que não sai em até 1 hora é descartado.
- No iPhone, o push só funciona com o Escalou instalado na tela de início.
