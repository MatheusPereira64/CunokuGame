/**
 * Estados possíveis do jogo Cunoku
 */
export enum GameState {
  /** Jogo aguardando início (configuração) */
  WAITING = 'WAITING',
  /** Jogo em andamento (turno normal) */
  PLAYING = 'PLAYING',
  /** Janela de reação ativa (descarte encadeado) */
  REACTION = 'REACTION',
  /** Habilidade sendo executada */
  ABILITY_ACTIVE = 'ABILITY_ACTIVE',
  /** Jogo finalizado */
  GAME_OVER = 'GAME_OVER',
}

