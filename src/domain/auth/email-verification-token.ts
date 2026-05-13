import {
  generateSessionToken,
  hashSessionToken,
} from "@/lib/crypto/session-token";

export const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
export const MAX_EMAIL_VERIFICATION_TTL_SECONDS = 60 * 60 * 24;

export type EmailVerificationCredential = {
  token: string;
  tokenHash: string;
  expiresAt: string;
};

export type CreateEmailVerificationCredentialInput = {
  now?: Date;
  ttlSeconds?: number;
  byteLength?: number;
};

function clampTtlSeconds(ttlSeconds: number): number {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    return MAX_EMAIL_VERIFICATION_TTL_SECONDS;
  }

  return Math.min(Math.floor(ttlSeconds), MAX_EMAIL_VERIFICATION_TTL_SECONDS);
}

export async function hashEmailVerificationToken(token: string): Promise<string> {
  return hashSessionToken(token);
}

export async function createEmailVerificationCredential(
  input: CreateEmailVerificationCredentialInput = {}
): Promise<EmailVerificationCredential> {
  const now = input.now ?? new Date();
  const ttlSeconds = clampTtlSeconds(
    input.ttlSeconds ?? MAX_EMAIL_VERIFICATION_TTL_SECONDS
  );
  const token = generateSessionToken(
    input.byteLength ?? EMAIL_VERIFICATION_TOKEN_BYTES
  );

  return {
    token,
    tokenHash: await hashEmailVerificationToken(token),
    expiresAt: new Date(now.getTime() + ttlSeconds * 1000).toISOString(),
  };
}
