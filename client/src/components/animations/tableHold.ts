import { useSyncExternalStore } from "react";

/**
 * Lugares da mesa que esperam uma carta voadora pousar antes de mostrar o estado novo:
 * - slots: carta da mão (`${playerId}_${índice}`) que acabou de ser trocada;
 * - pileCards: ids das cartas que ainda estão a caminho da pilha de descarte;
 * - faces: sua carta espiada, que só vira depois que a carta do poder cai na pilha.
 * O estado do jogo muda na hora; a mesa só "alcança" quando a animação chega.
 *
 * Cada espera é ligada à sua carta: quando a carta X pousa, só a espera de X é liberada.
 * (Uma fila única, liberada por ordem, travava em cadeia: bastava uma carta sem animação
 * para todas as seguintes esperarem o limite de segurança.)
 */
export type TableHold = { slots: ReadonlySet<string>; pileCards: ReadonlySet<string>; faces: ReadonlySet<string> };

/** Se a animação não rodar (fila travada, aba em segundo plano), libera mesmo assim. */
const SAFETY_MS = 2500;

const EMPTY: TableHold = { slots: new Set(), pileCards: new Set(), faces: new Set() };
let hold: TableHold = EMPTY;
const listeners = new Set<() => void>();

function publish(next: TableHold) {
  const empty = next.slots.size === 0 && next.pileCards.size === 0 && next.faces.size === 0;
  hold = empty ? EMPTY : next;
  listeners.forEach((listener) => listener());
}

function without(set: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(set);
  next.delete(key);
  return next;
}

export function slotKey(playerId: string, cardIndex: number) {
  return `${playerId}_${cardIndex}`;
}

export function holdSlot(key: string): void {
  if (hold.slots.has(key)) return;
  publish({ ...hold, slots: new Set(hold.slots).add(key) });
  setTimeout(() => releaseSlot(key), SAFETY_MS);
}

export function releaseSlot(key: string): void {
  if (!hold.slots.has(key)) return;
  publish({ ...hold, slots: without(hold.slots, key) });
}

/** A carta `cardId` está voando para a pilha: a pilha mostra a de baixo até ela pousar. */
export function holdPileCard(cardId: string): void {
  if (hold.pileCards.has(cardId)) return;
  publish({ ...hold, pileCards: new Set(hold.pileCards).add(cardId) });
  setTimeout(() => releasePileCard(cardId), SAFETY_MS);
}

function releasePileCard(cardId: string): void {
  if (!hold.pileCards.has(cardId)) return;
  publish({ ...hold, pileCards: without(hold.pileCards, cardId) });
}

/** A carta pousou na pilha: libera a espera dela e quem aguardava esse momento. */
export function landOnPile(cardId: string): void {
  releasePileCard(cardId);
  // Quem esperava a carta do poder chegar à pilha (revelações) segue agora
  landingWaiters.splice(0).forEach((run) => run());
}

/** Carta do topo que a pilha deve mostrar agora (pula as que ainda estão voando). */
export function visiblePileIndex<T extends { id: string }>(pile: readonly T[], held: ReadonlySet<string>): number {
  for (let i = pile.length - 1; i >= 0; i--) {
    if (!held.has(pile[i].id)) return i;
  }
  return -1;
}

/**
 * Revelações de poder (espiar, Rei, Coringa) esperam a carta usada cair na pilha:
 * assim a carta voando não passa por cima do que está sendo revelado.
 */
let landingWaiters: (() => void)[] = [];

export function afterPileLanding(run: () => void, maxWaitMs = SAFETY_MS): void {
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    run();
  };
  landingWaiters.push(go);
  setTimeout(go, maxWaitMs);
}

/** Sua carta espiada continua de costas até a revelação começar. */
export function holdFace(key: string): void {
  publish({ ...hold, faces: new Set(hold.faces).add(key) });
  setTimeout(() => releaseFace(key), SAFETY_MS);
}

export function releaseFace(key: string): void {
  if (!hold.faces.has(key)) return;
  publish({ ...hold, faces: without(hold.faces, key) });
}

/** Libera tudo: animações desligadas ou saída da partida. */
export function releaseAll(): void {
  landingWaiters.splice(0).forEach((run) => run());
  if (hold !== EMPTY) publish(EMPTY);
}

/** Estado atual (o mesmo que useTableHold devolve). */
export function currentTableHold(): TableHold {
  return hold;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTableHold(): TableHold {
  return useSyncExternalStore(subscribe, currentTableHold, () => EMPTY);
}
