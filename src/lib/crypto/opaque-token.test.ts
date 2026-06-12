import { describe, expect, it } from "vitest";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  verifyOpaqueToken,
} from "./opaque-token";

describe("opaque token crypto helpers", () => {
  it("generates base64url opaque tokens", () => {
    const token = generateOpaqueToken(32);

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).toHaveLength(43);
  });

  it("hashes and verifies tokens without exposing raw token material", async () => {
    const hash = await hashOpaqueToken("raw-checkout-token");

    expect(hash).toBe(
      "c18c1e0ebca6775bcd671d647356537cb6030e712e45ef0ab3a05681c5cc3fb7"
    );
    await expect(verifyOpaqueToken("raw-checkout-token", hash)).resolves.toBe(
      true
    );
    await expect(verifyOpaqueToken("wrong-token", hash)).resolves.toBe(false);
  });
});
