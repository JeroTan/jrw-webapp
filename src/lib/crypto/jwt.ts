// Using jose to create and verify JWTs
import { SignJWT, jwtVerify } from 'jose';

// Convert secret string to Uint8Array for jose
function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function jwtEncrypt<Payload extends object>({payload, secretKey, expiresInSeconds = 3600}: {payload: Payload, secretKey: string, expiresInSeconds?: number}): Promise<{data: string, error: null} | {data: null, error: string}> {
  try {
    const secret = getSecretKey(secretKey);
    
    const jwt = await new SignJWT(payload as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${expiresInSeconds}s`)
      .sign(secret);
    
    return { data: jwt, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create JWT';
    return { data: null, error: errorMessage };
  }
}

export async function jwtDecrypt<Payload extends object>({token, secretKey}: {token: string, secretKey: string}): Promise<{data: Payload, error: null} | {data: null, error: string}> {
  try {
    const secret = getSecretKey(secretKey);
    
    const { payload } = await jwtVerify(token, secret);
    
    return { data: payload as Payload, error: null };
  } catch (err) {
    let errorMessage = err instanceof Error ? err.message : 'Failed to verify JWT';
    
    // Make expiration errors more readable
    if (errorMessage.includes('"exp" claim timestamp check failed')) {
      errorMessage = 'Token expired';
    }
    
    return { data: null, error: errorMessage };
  }
}