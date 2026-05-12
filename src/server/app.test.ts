import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("createApp", () => {
  it("exposes JRW OpenAPI metadata from the canonical server composer", async () => {
    const app = createApp();
    const response = await app.handle(new Request("https://jrw.test/api/openapi/json"));
    const body = (await response.json()) as {
      info?: {
        title?: string;
        description?: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.info?.title).toBe("JRW Webapp API");
    expect(body.info?.description).toContain("JRW single-store ecommerce");
    expect(body.info?.title).not.toContain("QR Resto");
  });
});
