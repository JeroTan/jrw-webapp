import { describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/crypto/password";
import {
  verifyPasswordCredential,
  verifyPasswordCredentialTimingDummy,
} from "./password-credentials";

describe("password credential verification", () => {
  it("accepts correct peppered PBKDF2 credentials", async () => {
    const pepper = "test-pepper";
    const credential = await hashPassword("correct horse battery staple", pepper, {
      iterations: 1,
      saltBytes: 4,
    });

    await expect(
      verifyPasswordCredential({
        password: "correct horse battery staple",
        pepper,
        passwordHash: credential.passwordHash,
        passwordSalt: credential.passwordSalt,
      })
    ).resolves.toEqual({ ok: true });
  });

  it("rejects wrong password with safe credential failure", async () => {
    const pepper = "test-pepper";
    const credential = await hashPassword("correct horse battery staple", pepper, {
      iterations: 1,
      saltBytes: 4,
    });

    await expect(
      verifyPasswordCredential({
        password: "wrong password",
        pepper,
        passwordHash: credential.passwordHash,
        passwordSalt: credential.passwordSalt,
      })
    ).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION",
      reason: "WRONG_PASSWORD",
    });
  });

  it("rejects legacy or unsalted password storage as unsupported", async () => {
    await expect(
      verifyPasswordCredential({
        password: "correct horse battery staple",
        pepper: "test-pepper",
        passwordHash: "legacy-sha256-hash",
        passwordSalt: null,
      })
    ).resolves.toEqual({
      ok: false,
      code: "AUTHENTICATION",
      reason: "UNSUPPORTED_PASSWORD_HASH",
    });
  });

  it("runs the timing dummy through Web Crypto without throwing", async () => {
    await expect(
      verifyPasswordCredentialTimingDummy({
        password: "missing-account-password",
        pepper: "test-pepper",
      })
    ).resolves.toBeUndefined();
  });
});
