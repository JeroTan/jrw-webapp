import { describe, expect, it } from "vitest";
import { createSessionCredential } from "./session-credentials";

describe("session credential creation", () => {
  it("creates opaque token material and a distinct hash for storage", async () => {
    const credential = await createSessionCredential();

    expect(credential.sessionToken).toEqual(expect.any(String));
    expect(credential.tokenHash).toEqual(expect.stringMatching(/^[0-9a-f]{64}$/));
    expect(credential.tokenHash).not.toBe(credential.sessionToken);
  });
});
