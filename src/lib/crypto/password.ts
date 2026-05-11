export type PasswordHashOptions = {
  iterations?: number;
  saltBytes?: number;
};

export type PasswordHashResult = {
  passwordHash: string;
  passwordSalt: string;
};

const PASSWORD_ALGORITHM = "pbkdf2-sha256";
const DEFAULT_ITERATIONS = 99_999; // Cloudflare Worker maximum iterations is 100,000, but we leave some headroom for future increases without breaking existing hashes
const DEFAULT_SALT_BYTES = 16;
const HASH_BYTES = 32;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    throw new Error("Invalid hex");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  const maxLength = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;

  for (let index = 0; index < maxLength; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return diff === 0;
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function derivePasswordHash(
  password: string,
  pepper: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${pepper}\u0000${password}`),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(hexToBytes(saltHex)),
      iterations,
    },
    material,
    HASH_BYTES * 8,
  );

  return bytesToHex(new Uint8Array(bits));
}

export async function hashPassword(
  password: string,
  pepper: string,
  options: PasswordHashOptions = {},
): Promise<PasswordHashResult> {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const passwordSalt = randomHex(options.saltBytes ?? DEFAULT_SALT_BYTES);
  const digest = await derivePasswordHash(password, pepper, passwordSalt, iterations);

  return {
    passwordHash: `${PASSWORD_ALGORITHM}$${iterations}$${digest}`,
    passwordSalt,
  };
}

export async function verifyPassword(
  password: string,
  pepper: string,
  storedHash: string,
  storedSalt: string,
): Promise<boolean> {
  try {
    const [algorithm, iterationsText, expectedDigestHex] = storedHash.split("$");
    const iterations = Number(iterationsText);

    if (algorithm !== PASSWORD_ALGORITHM || !Number.isInteger(iterations) || iterations <= 0) {
      return false;
    }

    const computedDigestHex = await derivePasswordHash(password, pepper, storedSalt, iterations);
    return constantTimeEqual(hexToBytes(computedDigestHex), hexToBytes(expectedDigestHex));
  } catch {
    return false;
  }
}
