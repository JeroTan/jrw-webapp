import {
  generateSessionToken,
  hashSessionToken,
} from "@/lib/crypto/session-token";

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const MAX_PASSWORD_RESET_TTL_SECONDS = 60 * 30;

export type PasswordResetCredential = {
  token: string;
  tokenHash: string;
  expiresAt: string;
};

export type CreatePasswordResetCredentialInput = {
  now?: Date;
  ttlSeconds?: number;
  byteLength?: number;
};

function clampTtlSeconds(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return MAX_PASSWORD_RESET_TTL_SECONDS;
  }

  return Math.min(Math.floor(ttlSeconds), MAX_PASSWORD_RESET_TTL_SECONDS);
}

export async function hashPasswordResetToken(token: string): Promise<string> {
  return hashSessionToken(token);
}

export async function createPasswordResetCredential(
  input: CreatePasswordResetCredentialInput = {}
): Promise<PasswordResetCredential> {
  const now = input.now ?? new Date();
  const ttlSeconds = clampTtlSeconds(
    input.ttlSeconds ?? MAX_PASSWORD_RESET_TTL_SECONDS
  );
  const token = generateSessionToken(
    input.byteLength ?? PASSWORD_RESET_TOKEN_BYTES
  );

  return {
    token,
    tokenHash: await hashPasswordResetToken(token),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
  };
}
