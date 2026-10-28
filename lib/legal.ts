import { FORMATIONS } from "@/lib/lineup-rules";

/**
 * Textos de termos, privacidade e regulamento do teste.
 * Ao mudar o conteúdo dos termos de forma relevante, troque `TERMOS_VERSAO`:
 * o onboarding grava a versão aceita em `perfis.termos_versao`.
 */
export const TERMOS_VERSAO = "v2";
export const LEGAL_ATUALIZADO_EM = "27/10/2026";

export type LegalSection = { titulo: string; paragrafos: string[] };

export type LegalDocument = {
  href: "/termos" | "/privacidade" | "/regulamento";
  titulo: string;
  descricao: string;
  resumo: string;
  secoes: LegalSection[];
};

const formacoes = Object.keys(FORMATIONS).join(", ");

export const TERMOS: LegalDocument = {
  href: "/termos",
  titulo: "Termos de uso",
  descricao: "Termos de uso do Escalou.",
  resumo: "O Escalou é um fantasy de futebol do Brasileirão Série A para disputar com amigos em grupos privados. Não é aposta e não tem prêmio em dinheiro.",
  secoes: [
    {
      titulo: "O que é o Escalou",
      paragrafos: [
        "Você monta um time de 11 jogadores reais a cada rodada e soma pontos conforme o desempenho deles em campo. A disputa acontece nos rankings dos grupos de que você participa.",
        "O Escalou é um produto independente, sem vínculo com clubes, ligas, a CBF ou entidades esportivas.",
      ],
    },
    {
      titulo: "Sem apostas e sem prêmio",
      paragrafos: [
        "Não há apostas, odds, depósitos, saques nem premiação em dinheiro. O resultado depende do seu conhecimento de futebol e da sua estratégia, com regras definidas antes de cada rodada.",
        "O saldo em C$ (cartoletas) é uma moeda do jogo: não vale dinheiro, não pode ser comprado, vendido nem trocado.",
      ],
    },
    {
      titulo: "Fase de teste",
      paragrafos: [
        "O Escalou está em teste fechado. O acesso é liberado por convite, e entrar na lista de espera não garante acesso imediato.",
        "Durante o teste, regras, preços dos jogadores e funcionalidades podem mudar para corrigir erros ou equilibrar o jogo. Mudanças relevantes são avisadas no app antes de valer.",
      ],
    },
    {
      titulo: "Sua conta",
      paragrafos: [
        "O acesso é feito com sua conta Google ou por link enviado ao seu e-mail. Cada pessoa pode ter apenas uma conta.",
        "Seu apelido aparece nos rankings dos seus grupos. Não use apelidos ofensivos, que imitem outra pessoa ou que contenham dados pessoais de terceiros.",
      ],
    },
    {
      titulo: "Conduta",
      paragrafos: [
        "Não é permitido criar contas múltiplas, automatizar o uso do app, explorar falhas para ganhar vantagem ou atrapalhar outros participantes.",
        "Contas que descumprirem estes termos podem ser suspensas ou removidas dos grupos, e os pontos obtidos de forma irregular podem ser anulados.",
      ],
    },
    {
      titulo: "Dados das partidas",
      paragrafos: [
        "Escalações, jogos e estatísticas vêm de um provedor externo de dados esportivos. Atrasos, correções e falhas desse provedor podem alterar pontuações e rankings até o fechamento oficial da rodada.",
        "Fazemos o possível para manter o app disponível e os dados corretos, mas não garantimos funcionamento sem interrupções.",
      ],
    },
    {
      titulo: "Alterações e contato",
      paragrafos: [
        "Podemos atualizar estes termos. Quando a mudança for relevante, você será avisado e, se necessário, precisará aceitar a nova versão para continuar jogando.",
        "Dúvidas e pedidos podem ser enviados ao administrador do seu grupo, que os encaminha à equipe do Escalou.",
      ],
    },
  ],
};

export const PRIVACIDADE: LegalDocument = {
  href: "/privacidade",
  titulo: "Política de privacidade",
  descricao: "Política de privacidade do Escalou.",
  resumo: "Coletamos o mínimo para você jogar e para entendermos se o jogo funciona. Não vendemos dados e não os usamos para apostas.",
  secoes: [
    {
      titulo: "Dados que coletamos",
      paragrafos: [
        "Conta: e-mail usado no login com Google ou por link mágico.",
        "Perfil: apelido, clube do coração (opcional) e WhatsApp, quando informado no convite ou no perfil.",
        "Jogo: escalações, pontuações, grupos de que você participa e posições nos rankings.",
        "Lista de espera: nome ou apelido, WhatsApp e e-mail informados no formulário.",
      ],
    },
    {
      titulo: "Para que usamos",
      paragrafos: [
        "Para criar e proteger sua conta, montar os rankings dos grupos, avisar sobre convites e rodadas e responder seus pedidos.",
        "Para melhorar o jogo, medimos o uso do app (telas visitadas, escalações salvas, resumos compartilhados). Essas métricas usam apenas um identificador interno da sua conta, sem nome, apelido, e-mail ou telefone.",
      ],
    },
    {
      titulo: "Quem vê seus dados",
      paragrafos: [
        "Os membros dos seus grupos veem seu apelido, a sigla do seu clube do coração e sua pontuação nos rankings. E-mail e WhatsApp não são exibidos para outros participantes.",
        "Usamos serviços que tratam dados em nosso nome: Supabase (autenticação e banco de dados), Google (login, quando você escolhe essa opção) e PostHog (métricas de uso).",
        "Não vendemos dados pessoais e não os compartilhamos para ofertas de apostas ou jogos de azar.",
      ],
    },
    {
      titulo: "Cookies",
      paragrafos: [
        "Usamos cookies necessários para manter você conectado e lembrar convites em andamento, além do armazenamento local do navegador para as métricas de uso.",
      ],
    },
    {
      titulo: "Por quanto tempo guardamos",
      paragrafos: [
        "Mantemos os dados enquanto sua conta existir. Os dados da lista de espera são mantidos até o fim do teste ou até você pedir a remoção.",
      ],
    },
    {
      titulo: "Seus direitos",
      paragrafos: [
        "Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados e revogar consentimentos.",
        "Apelido, clube do coração e WhatsApp podem ser alterados no seu perfil. Os demais pedidos, incluindo a exclusão da conta, podem ser feitos ao administrador do seu grupo, que os encaminha à equipe do Escalou.",
      ],
    },
  ],
};

export const REGULAMENTO: LegalDocument = {
  href: "/regulamento",
  titulo: "Regulamento do teste",
  descricao: "Regulamento simplificado da fase de teste do Escalou.",
  resumo: "As regras da disputa durante o teste fechado. A participação não tem prêmio em dinheiro: vale o ranking entre amigos.",
  secoes: [
    {
      titulo: "Quem participa",
      paragrafos: [
        "Pessoas convidadas para um grupo que concluíram o cadastro e aceitaram os termos de uso.",
        "Administradores dos grupos não disputam os rankings.",
      ],
    },
    {
      titulo: "Duração",
      paragrafos: [
        "O teste acompanha rodadas reais do Brasileirão Série A e deve durar entre 4 e 6 rodadas. O encerramento será avisado no app.",
      ],
    },
    {
      titulo: "Montando o time",
      paragrafos: [
        `Escolha 11 jogadores em uma das formações permitidas: ${formacoes}. As posições são goleiro, defensor, meio-campo e atacante.`,
        "O custo do time precisa caber no seu saldo. Todo participante começa com C$ 60,00, e o saldo cresce quando os jogadores pontuam acima do preço pago. O saldo nunca diminui.",
        "É possível ter uma escalação por rodada e editá-la quantas vezes quiser até a trava.",
      ],
    },
    {
      titulo: "Trava da rodada",
      paragrafos: [
        "A escalação trava uma hora antes do primeiro jogo da rodada. Depois disso, ninguém altera o time até a próxima rodada abrir.",
        "Quem não escalar soma 0 ponto na rodada.",
      ],
    },
    {
      titulo: "Pontuação",
      paragrafos: [
        "Os pontos são lançados quando cada jogo termina, a partir dos scouts de cada jogador (gols, assistências, finalizações, desarmes, defesas, cartões e outros). A tabela completa está em Como funciona.",
        "Jogador que não entrou em campo, ou cujo jogo foi adiado ou cancelado, soma 0 na rodada.",
        "O fechamento oficial acontece no dia seguinte ao último jogo, com uma nova leitura dos dados para incluir correções.",
      ],
    },
    {
      titulo: "Rankings e desempate",
      paragrafos: [
        "Cada grupo tem o ranking da rodada e o do campeonato, que soma todas as rodadas já travadas.",
        "Na rodada, o desempate considera, nesta ordem: mais gols dos jogadores escalados, menor custo do time e quem salvou o time primeiro.",
        "No campeonato, o desempate considera mais gols dos jogadores escalados no acumulado. Persistindo o empate, os participantes dividem a posição.",
      ],
    },
    {
      titulo: "Sem prêmio",
      paragrafos: [
        "Não há prêmio em dinheiro, bens ou vantagens. Nenhum valor é arrecadado para formar prêmio.",
        "Pontos irregulares, obtidos com contas múltiplas ou falhas do app, podem ser anulados, e o ranking recalculado.",
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = [TERMOS, PRIVACIDADE, REGULAMENTO] as const;
