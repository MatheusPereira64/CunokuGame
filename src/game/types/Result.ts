/**
 * Tipo de resultado para operações que podem falhar
 * Usado para retornar sucesso ou erro de forma type-safe
 */
export type Result<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Cria um resultado de sucesso
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Cria um resultado de erro
 */
export function failure(error: string): Result<never> {
  return { success: false, error };
}

