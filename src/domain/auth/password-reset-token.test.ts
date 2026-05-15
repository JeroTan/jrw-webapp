import { describe, expect, it } from "vitest";
import {
  createPasswordResetCredential,
  hashPasswordResetToken,
  MAX_PASSWORD_RESET_TTL_SECONDS,
  PASSWORD_RESET_TOKEN_BYTES,
} from "./password-reset-token";

describe("password reset token credentials", () => {
  it("creates opaque 32-byte tokens, stores only SHA-256 hashes, and clamps TTL to 30 minutes", async () => {
    const credential = await createPasswordResetCredential({
      now: new Date("2026-05-15T00:00:00.000Z"),
      ttlSeconds: 60 * 60,
    });

    expect(PASSWORD_RESET_TOKEN_BYTES).toBe(32);
    expect(MAX_PASSWORD_RESET_TTL_SECONDS).toBe(30 * 60);
    expect(credential.token).toHaveLength(43);
    expect(credential.tokenHash).toHaveLength(64);
    expect(credential.tokenHash).not.toBe(credential.token);
    expect(credential.expiresAt).toBe("2026-05-15T00:30:00.000Z");
    await expect(hashPasswordResetToken(credential.token)).resolves.toBe(
      credential.tokenHash
    );
  });
});
