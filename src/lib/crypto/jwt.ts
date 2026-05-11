import { SignJWT, jwtVerify } from "jose";

export type JwtResult<T> = { data: T; error: null } | { data: null; error: string };

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function jwtEncrypt<Payload extends object>({
  payload,
  secretKey,
  expiresInSeconds = 3600,
}: {
  payload: Payload;
  secretKey: string;
  expiresInSeconds?: number;
}): Promise<JwtResult<string>> {
  try {
    const secret = getSecretKey(secretKey);

    const jwt = await new SignJWT(payload as Record<string, unknown>)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${expiresInSeconds}s`)
      .sign(secret);

    return { data: jwt, error: null };
  } catch {
    return { data: null, error: "Failed to create JWT" };
  }
}

export async function jwtDecrypt<Payload extends object>({
  token,
  secretKey,
}: {
  token: string;
  secretKey: string;
}): Promise<JwtResult<Payload>> {
  try {
    const secret = getSecretKey(secretKey);

    const { payload } = await jwtVerify(token, secret);

    return { data: payload as Payload, error: null };
  } catch {
    return { data: null, error: "Failed to verify JWT" };
  }
}
