import { describe, expect, it } from "vitest";
import { noopOperationalLogger } from "@/adapter/infrastructure/logging/operational-log";
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

  it("registers canonical foundation routes through the server route container", async () => {
    const app = createApp();
    const response = await app.handle(new Request("https://jrw.test/api/"));
    const body = (await response.json()) as {
      data?: {
        name?: string;
        routeGroups?: string[];
      };
    };

    expect(response.status).toBe(200);
    expect(body.data?.name).toBe("jrw-webapp-api");
    expect(body.data?.routeGroups).toContain("auth");
    expect(body.data?.routeGroups).toContain("payments");
  });

  it("adds request ID metadata and response header to successful completed endpoints", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/", {
        headers: { "x-request-id": "req_client_provided" },
      }),
    );
    const body = (await response.json()) as {
      meta?: {
        requestId?: string;
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req_client_provided");
    expect(body.meta?.requestId).toBe("req_client_provided");
  });

  it("generates request ID metadata and response header when header is missing", async () => {
    const app = createApp();
    const response = await app.handle(new Request("https://jrw.test/api/"));
    const body = (await response.json()) as {
      meta?: {
        requestId?: string;
      };
    };

    expect(response.status).toBe(200);
    expect(body.meta?.requestId).toMatch(/^req_/);
    expect(response.headers.get("x-request-id")).toBe(body.meta?.requestId);
  });

  it("returns a request-aware 404 API envelope for missing routes", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/missing", {
        headers: { "x-request-id": "req_missing" },
      }),
    );
    const body = (await response.json()) as {
      error?: {
        code?: string;
        message?: string;
        details?: {
          requestId?: string;
        };
      };
    };

    expect(response.status).toBe(404);
    expect(response.headers.get("x-request-id")).toBe("req_missing");
    expect(body.error?.code).toBe("RESOURCE_NOT_FOUND");
    expect(body.error?.message).toBe("The requested resource was not found.");
    expect(body.error?.details?.requestId).toBe("req_missing");
  });

  it("returns safe request-aware envelopes for unexpected errors", async () => {
    const app = createApp({ operationalLogger: noopOperationalLogger }).get("/boom", () => {
      throw new Error("raw db password secret stack should not leak");
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/boom", {
        headers: { "x-request-id": "req_boom" },
      }),
    );
    const body = (await response.json()) as {
      error?: {
        code?: string;
        message?: string;
        details?: {
          requestId?: string;
        };
      };
    };

    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toBe("req_boom");
    expect(body.error?.code).toBe("INTERNAL_ERROR");
    expect(body.error?.message).toBe("An internal error occurred.");
    expect(body.error?.details?.requestId).toBe("req_boom");
    expect(JSON.stringify(body)).not.toContain("password");
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(JSON.stringify(body)).not.toContain("stack");
  });
});
