/** Gera código de sala (compatível com Node e Cloudflare Workers). */
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 4): string {
  if (length < 1) {
    throw new Error("Room code length must be >= 1");
  }
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_ALPHABET[bytes[i]! % ROOM_CODE_ALPHABET.length];
  }
  return code;
}

export function newPlayerId(): string {
  return crypto.randomUUID();
}
