/** Hash PIN/token com Web Crypto (Worker + Node 20+). */

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function randomHex(byteLength = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToHex(bytes);
}

export async function hashPin(pin: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return {
    hash: bytesToHex(new Uint8Array(bits)),
    salt: bytesToHex(salt),
  };
}

export async function verifyPin(pin: string, saltHex: string, expectedHash: string): Promise<boolean> {
  const { hash } = await hashPin(pin, saltHex);
  return timingSafeEqualHex(hash, expectedHash);
}

/** Comparação em tempo constante (evita timing attacks em hashes hex). */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function hashToken(token: string): Promise<string> {
  const dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(dig));
}

export function newPlayerUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return randomHex(16);
}
