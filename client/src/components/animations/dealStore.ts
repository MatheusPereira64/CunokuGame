import { useSyncExternalStore } from "react";

/**
 * Progresso da distribuição inicial, compartilhado entre a animação e a mesa.
 * Enquanto a distribuição está ativa, cada carta da mesa só aparece quando a carta
 * voadora pousa nela (chave `${playerId}_${índice}`).
 */
export type DealProgress = { active: boolean; dealt: ReadonlySet<string> };

/** Se a animação não começar (ou travar), a mesa aparece inteira depois disso. */
const SAFETY_MS = 15_000;

const IDLE: DealProgress = { active: false, dealt: new Set() };
let progress: DealProgress = IDLE;
let safetyTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function publish(next: DealProgress) {
  progress = next;
  listeners.forEach((listener) => listener());
}

export function dealKey(playerId: string, cardIndex: number) {
  return `${playerId}_${cardIndex}`;
}

/** Esconde as cartas da mesa até a animação entregar cada uma. */
export function beginDeal(): void {
  clearTimeout(safetyTimer);
  safetyTimer = setTimeout(endDeal, SAFETY_MS);
  publish({ active: true, dealt: new Set() });
}

export function markDealt(key: string): void {
  if (!progress.active || progress.dealt.has(key)) return;
  publish({ active: true, dealt: new Set(progress.dealt).add(key) });
}

export function endDeal(): void {
  clearTimeout(safetyTimer);
  if (progress !== IDLE) publish(IDLE);
}

export function isCardDealt(state: DealProgress, playerId: string, cardIndex: number): boolean {
  return !state.active || state.dealt.has(dealKey(playerId, cardIndex));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDealProgress(): DealProgress {
  return useSyncExternalStore(subscribe, () => progress, () => IDLE);
}
