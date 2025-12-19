import { Card } from '../models/Card';
import { Player } from '../models/Player';
import { Ability } from '../enums/Ability';

/**
 * Avalia o valor de uma carta para estratégia
 * Retorna score: menor = melhor (objetivo é ter menor pontuação)
 */
export function avaliarCarta(carta: Card): number {
  // Valor base da carta (menor é melhor)
  let score = carta.getValue();

  // Ajustes estratégicos
  if (carta.hasAbility()) {
    // Habilidades têm valor estratégico positivo
    switch (carta.habilidade) {
      case Ability.SEE_OPPONENT:
      case Ability.SEE_OWN:
        score -= 2; // Informação é valiosa
        break;
      case Ability.SWAP_CARDS:
        score -= 3; // Troca pode ser muito útil
        break;
    }
  }

  // Cartas especiais muito valiosas
  if (carta.nome === 'Rei') {
    score = -5; // Rei (0) é excelente
  } else if (carta.nome === 'Coringa') {
    score = -6; // Coringa (-1) é ainda melhor
  }

  return score;
}

/**
 * Escolhe a melhor carta para descartar (maior valor = pior)
 */
export function escolherCartaParaDescartar(mao: Card[]): number {
  if (mao.length === 0) {
    return 0;
  }

  let worstIndex = 0;
  let worstScore = avaliarCarta(mao[0]);

  for (let i = 1; i < mao.length; i++) {
    const score = avaliarCarta(mao[i]);
    if (score > worstScore) {
      worstScore = score;
      worstIndex = i;
    }
  }

  return worstIndex;
}

/**
 * Decide se deve substituir uma carta da mão pela comprada
 */
export function deveSubstituirCarta(cartaComprada: Card, mao: Card[]): boolean {
  if (mao.length === 0) {
    return false;
  }

  const scoreComprada = avaliarCarta(cartaComprada);
  const piorCarta = escolherCartaParaDescartar(mao);
  const scorePior = avaliarCarta(mao[piorCarta]);

  // Substitui se carta comprada é melhor (menor score)
  return scoreComprada < scorePior;
}

/**
 * Escolhe qual carta substituir
 */
export function escolherCartaParaSubstituir(cartaComprada: Card, mao: Card[]): number {
  return escolherCartaParaDescartar(mao);
}

/**
 * Decide se deve usar habilidade de uma carta
 */
export function deveUsarHabilidade(carta: Card, mao: Card[], turnoAtual: number): boolean {
  if (!carta.hasAbility()) {
    return false;
  }

  // Usa habilidade se for estratégico
  switch (carta.habilidade) {
    case Ability.SEE_OPPONENT:
      // Usa se ainda não viu muitas cartas ou está em dúvida
      return turnoAtual < 8 || Math.random() < 0.6;
    case Ability.SEE_OWN:
      // Usa se tem muitas cartas desconhecidas
      return Math.random() < 0.5;
    case Ability.SWAP_CARDS:
      // Usa se tem carta ruim e pode trocar
      const piorCarta = escolherCartaParaDescartar(mao);
      const scorePior = avaliarCarta(mao[piorCarta]);
      return scorePior > 5; // Tem carta ruim para trocar
    default:
      return false;
  }
}

/**
 * Escolhe oponente para habilidade "Ver Oponente"
 * Prefere jogador com menor pontuação conhecida ou aleatório
 */
export function escolherOponente(
  outrosJogadores: Player[],
  memoria?: Map<string, Card[]>
): string | null {
  if (outrosJogadores.length === 0) {
    return null;
  }

  // Se tem memória, escolhe jogador com menor pontuação estimada
  if (memoria) {
    let melhorOponente: Player | null = null;
    let menorPontuacao = Infinity;

    outrosJogadores.forEach((player) => {
      const memorias = memoria.get(player.id) || [];
      const pontuacaoEstimada = memorias.reduce((sum, card) => sum + card.getValue(), 0);
      if (pontuacaoEstimada < menorPontuacao) {
        menorPontuacao = pontuacaoEstimada;
        melhorOponente = player;
      }
    });

    if (melhorOponente) {
      return melhorOponente.id;
    }
  }

  // Caso contrário, escolhe aleatoriamente
  return outrosJogadores[Math.floor(Math.random() * outrosJogadores.length)].id;
}

/**
 * Escolhe índice de carta do oponente para ver
 */
export function escolherCartaOponente(opponent: Player): number {
  const cardCount = opponent.getMaoSize();
  if (cardCount === 0) {
    return 0;
  }
  // Escolhe aleatoriamente (bot não sabe qual carta é melhor)
  return Math.floor(Math.random() * cardCount);
}

/**
 * Escolhe índice de carta própria para ver
 */
export function escolherCartaPropria(mao: Card[]): number {
  if (mao.length === 0) {
    return 0;
  }
  // Escolhe aleatoriamente
  return Math.floor(Math.random() * mao.length);
}

/**
 * Escolhe jogadores e cartas para trocar
 */
export function escolherTrocaCartas(
  outrosJogadores: Player[],
  mao: Card[],
  memoria?: Map<string, Card[]>
): { player1Id: string; card1Index: number; player2Id: string; card2Index: number } | null {
  if (outrosJogadores.length < 2 || mao.length === 0) {
    return null;
  }

  // Escolhe dois jogadores aleatórios
  const shuffled = [...outrosJogadores].sort(() => Math.random() - 0.5);
  const player1 = shuffled[0];
  const player2 = shuffled[1];

  // Escolhe pior carta própria para dar
  const card1Index = escolherCartaParaDescartar(mao);

  // Escolhe carta aleatória do segundo jogador para receber
  const card2Index = Math.floor(Math.random() * player2.getMaoSize());

  return {
    player1Id: player1.id,
    card1Index,
    player2Id: player2.id,
    card2Index,
  };
}

/**
 * Decide se deve declarar fim do jogo
 */
export function deveDeclararFim(
  mao: Card[],
  turnoAtual: number,
  pontuacaoAtual: number
): boolean {
  // Precisa ter pelo menos 5 turnos
  if (turnoAtual < 5) {
    return false;
  }

  // Declara se pontuação está baixa
  if (pontuacaoAtual <= 10) {
    return Math.random() < 0.8; // 80% de chance
  } else if (pontuacaoAtual <= 20) {
    return Math.random() < 0.5; // 50% de chance
  } else if (pontuacaoAtual <= 30) {
    return Math.random() < 0.2; // 20% de chance
  }

  return false;
}

