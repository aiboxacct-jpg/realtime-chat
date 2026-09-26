// Password + token cryptography, ported from the original server actions.
// PBKDF2-SHA256 with 210_000 iterations via WebCrypto (available in the
// Vercel Node runtime). Stored format: pbkdf2$<iterations>$<saltHex>$<hashHex>

const subtle = globalThis.crypto.subtle;

export async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  const output = new Uint8Array(hex.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    const pair = hex.slice(index * 2, index * 2 + 2);
    output[index] = Number.parseInt(pair, 16);
  }
  return output;
}

async function derivePassword(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iterations = 210_000;
  const digest = await derivePassword(password, salt, iterations);
  return `pbkdf2$${iterations}$${bytesToHex(salt)}$${bytesToHex(digest)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, iterationsText, saltHex, expectedHex] = stored.split("$");
  if (algorithm !== "pbkdf2" || !iterationsText || !saltHex || !expectedHex)
    return false;
  const iterations = Number.parseInt(iterationsText, 10);
  const salt = hexToBytes(saltHex);
  const expected = hexToBytes(expectedHex);
  if (!Number.isFinite(iterations) || !salt || !expected) return false;
  const actual = await derivePassword(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  }
  return difference === 0;
}

export function newSessionToken(): string {
  return `${globalThis.crypto.randomUUID()}${globalThis.crypto.randomUUID()}`;
}
