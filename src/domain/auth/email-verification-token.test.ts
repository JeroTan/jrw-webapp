import { describe, expect, it } from "vitest";
import { hashSessionToken } from "@/lib/crypto/session-token";
import {
  MAX_EMAIL_VERIFICATION_TTL_SECONDS,
  createEmailVerificationCredential,
} from "./email-verification-token";

describe("email verification token credentials", () => {
  it("creates opaque tokens with stored hash only and <= 24 hour expiry", async () => {
    const credential = await createEmailVerificationCredential({
      now: new Date("2026-05-13T00:00:00.000Z"),
      ttlSeconds: 60 * 60 * 30,
    });

    expect(credential.token).toEqual(expect.any(String));
    expect(credential.token.length).toBeGreaterThanOrEqual(32);
    expect(credential.tokenHash).not.toBe(credential.token);
    await expect(hashSessionToken(credential.token)).resolves.toBe(
      credential.tokenHash
    );
    expect(credential.expiresAt).toBe("2026-05-14T00:00:00.000Z");
    expect(MAX_EMAIL_VERIFICATION_TTL_SECONDS).toBe(60 * 60 * 24);
  });

  it("allows shorter token lifetimes when requested", async () => {
    const credential = await createEmailVerificationCredential({
      now: new Date("2026-05-13T00:00:00.000Z"),
      ttlSeconds: 60 * 30,
    });

    expect(credential.expiresAt).toBe("2026-05-13T00:30:00.000Z");
  });
});
