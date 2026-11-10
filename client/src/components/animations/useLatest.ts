import { useRef } from "react";

/**
 * Guarda sempre a versão mais nova de um valor sem virar dependência de efeito.
 * As animações usam para o onComplete: online a partida redesenha a cada segundo (relógio da vez),
 * e um onComplete novo a cada render reiniciava os timers, travando a animação na tela.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
