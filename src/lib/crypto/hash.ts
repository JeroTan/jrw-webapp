// Use Web Crypto API for hashing functions

// Produce a hex string from an ArrayBuffer
function bufToHex(buffer: ArrayBufferLike): string {
  const arr = new Uint8Array(buffer);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function generateSalt(length = 16): Uint8Array {
  const salt = new Uint8Array(length);
  crypto.getRandomValues(salt);
  return salt;
}

// Returns a combined string of the form: <saltHex>$<hashHex>
export async function hash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const salt = generateSalt(16);
  const combined = new Uint8Array(salt.length + dataBuffer.length);
  combined.set(salt, 0);
  combined.set(dataBuffer, salt.length);

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined.buffer);
  const saltHex = bufToHex(salt.buffer);
  const hashHex = bufToHex(hashBuffer);

  return `${saltHex}$${hashHex}`;
}

// Verifies either a legacy unsalted hash (plain hash hex) OR the new salted format (salt$hash)
export async function verifyHash(data: string, hashToVerify: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // If the stored string contains a salt (salt$hash), use salt
  if (hashToVerify.includes('$')) {
    const [saltHex, expectedHashHex] = hashToVerify.split('$');
    const saltBytes = hexToBytes(saltHex);
    const combined = new Uint8Array(saltBytes.length + dataBuffer.length);
    combined.set(saltBytes, 0);
    combined.set(dataBuffer, saltBytes.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined.buffer);
    const computedHex = bufToHex(hashBuffer);
    return computedHex === expectedHashHex;
  }

  // Fallback: legacy unsalted verification (for existing hashes stored without a salt)
  const legacyHashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const legacyHex = bufToHex(legacyHashBuffer);
  return legacyHex === hashToVerify;
}