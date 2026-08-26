import { randomBytes } from "crypto";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Gera um código de sala com entropia criptográfica (não usar Math.random).
 * Usado como identificador de acesso à partida.
 */
export function generateRoomCode(length = 4): string {
  if (length < 1) {
    throw new Error("Room code length must be >= 1");
  }
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[bytes[i]! % ROOM_CODE_ALPHABET.length];
  }
  return code;
}
