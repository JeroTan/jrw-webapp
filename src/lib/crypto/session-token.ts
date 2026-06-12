import { generateOpaqueToken, hashOpaqueToken } from "./opaque-token";

export function generateSessionToken(byteLength = 32): string {
  return generateOpaqueToken(byteLength);
}

export function hashSessionToken(sessionToken: string): Promise<string> {
  return hashOpaqueToken(sessionToken);
}
