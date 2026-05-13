import { verifyPassword } from "@/lib/crypto/password";
import {
  evaluateCredentialFailure,
  type CredentialFailureDecision,
} from "./auth-decisions";

export type PasswordCredentialVerificationInput = {
  password: string;
  pepper: string;
  passwordHash: string | null | undefined;
  passwordSalt: string | null | undefined;
};

export type PasswordCredentialVerificationResult =
  | {
      ok: true;
    }
  | CredentialFailureDecision;

function isPepperedPbkdf2Hash(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("pbkdf2-sha256$");
}

export async function verifyPasswordCredential(
  input: PasswordCredentialVerificationInput
): Promise<PasswordCredentialVerificationResult> {
  if (!isPepperedPbkdf2Hash(input.passwordHash) || !input.passwordSalt) {
    return evaluateCredentialFailure("UNSUPPORTED_PASSWORD_HASH");
  }

  const verified = await verifyPassword(
    input.password,
    input.pepper,
    input.passwordHash,
    input.passwordSalt
  );

  return verified
    ? { ok: true }
    : evaluateCredentialFailure("WRONG_PASSWORD");
}
