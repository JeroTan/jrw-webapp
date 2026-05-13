import {
  generateSessionToken,
  hashSessionToken,
} from "@/lib/crypto/session-token";

export type SessionCredential = {
  sessionToken: string;
  tokenHash: string;
};

export async function createSessionCredential(): Promise<SessionCredential> {
  const sessionToken = generateSessionToken();
  const tokenHash = await hashSessionToken(sessionToken);

  return {
    sessionToken,
    tokenHash,
  };
}
