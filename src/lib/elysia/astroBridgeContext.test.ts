import { describe, expect, it } from "vitest";
import {
  bindAstroBridgeDecorations,
  clearAstroBridgeDecorations,
  getAstroBridgeDecorations,
} from "./astroBridgeContext";

describe("Astro bridge context", () => {
  it("binds runtime context per request and clears it after handling", () => {
    const request = new Request("https://jrw.test/api/products");
    const runtimeEnv = { DB: "test-db" } as unknown as Partial<Env> &
      Record<string, unknown>;

    bindAstroBridgeDecorations(request, {
      urlData: new URL(request.url),
      runtimeEnv,
    });

    expect(getAstroBridgeDecorations(request).urlData?.pathname).toBe("/api/products");
    expect(getAstroBridgeDecorations(request).runtimeEnv).toBe(runtimeEnv);

    clearAstroBridgeDecorations(request);

    expect(getAstroBridgeDecorations(request).urlData?.pathname).toBe("/api/products");
    expect(getAstroBridgeDecorations(request).runtimeEnv).toBeUndefined();
  });
});
