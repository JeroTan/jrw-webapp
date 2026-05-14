import { describe, expect, it } from "vitest";
import { t } from "elysia";
import {
  noopOperationalLogger,
  type OperationalLogEvent,
} from "@/adapter/infrastructure/logging/operational-log";
import { tboxApiSuccess } from "@/lib/typebox/api";
import { GeneralError } from "@/utils/general/error";
import { createApp } from "./app";

describe("createApp", () => {
  type OpenApiSchema = {
    type?: string;
    properties?: Record<string, OpenApiSchema>;
    items?: OpenApiSchema;
  };

  type OpenApiResponse = {
    content?: Record<
      string,
      {
        schema?: OpenApiSchema;
      }
    >;
  };

  it("exposes JRW OpenAPI metadata from the canonical server composer", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
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

  it("documents the completed Foundation endpoint with safe OpenAPI contract metadata", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const specText = await response.text();
    const body = JSON.parse(specText) as {
      paths?: {
        [path: string]: {
          get?: {
            summary?: string;
            description?: string;
            tags?: string[];
            responses?: Record<string, OpenApiResponse>;
            "x-auth"?: {
              mode?: string;
              roles?: string[];
            };
            "x-rate-limit-class"?: string;
            "x-error-codes"?: string[];
          };
        };
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");

    const foundationOperation = body.paths?.["/api/"]?.get;
    const successSchema =
      foundationOperation?.responses?.["200"]?.content?.["application/json"]
        ?.schema;
    const errorSchema =
      foundationOperation?.responses?.["500"]?.content?.["application/json"]
        ?.schema;

    expect(foundationOperation?.summary).toBe("API foundation");
    expect(foundationOperation?.description).toContain(
      "Reports canonical JRW API ownership"
    );
    expect(foundationOperation?.tags).toContain("Foundation");
    expect(successSchema?.type).toBe("object");
    expect(successSchema?.properties?.data?.type).toBe("object");
    expect(successSchema?.properties?.data?.properties?.name).toBeDefined();
    expect(successSchema?.properties?.data?.properties?.routeGroups?.type).toBe(
      "array"
    );
    expect(successSchema?.properties?.meta?.type).toBe("object");
    expect(errorSchema?.type).toBe("object");
    expect(errorSchema?.properties?.error?.properties?.code).toBeDefined();
    expect(errorSchema?.properties?.error?.properties?.message?.type).toBe(
      "string"
    );
    expect(foundationOperation?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(foundationOperation?.["x-rate-limit-class"]).toBe("public-read");
    expect(foundationOperation?.["x-error-codes"]).toEqual(["INTERNAL_ERROR"]);
    expect(specText).not.toMatch(
      /QR Resto|DATABASE_URL|PAYMONGO_SECRET|RESEND_API_KEY|JWT_SECRET|raw provider payload|sk_live_|sk_test_|Bearer\s+[A-Za-z0-9._-]+/i
    );
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
      })
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
      })
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
    const app = createApp({ operationalLogger: noopOperationalLogger }).get(
      "/boom",
      () => {
        throw new Error("raw db password secret stack should not leak");
      }
    );

    const response = await app.handle(
      new Request("https://jrw.test/api/boom", {
        headers: { "x-request-id": "req_boom" },
      })
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

  it("returns safe reason details for known operational errors", async () => {
    const app = createApp({ operationalLogger: noopOperationalLogger }).get(
      "/missing-auth-storage",
      () => {
        throw new GeneralError(
          { reason: "missing_db_binding" },
          "PROVIDER_UNAVAILABLE"
        );
      }
    );

    const response = await app.handle(
      new Request("https://jrw.test/api/missing-auth-storage", {
        headers: { "x-request-id": "req_missing_storage" },
      })
    );
    const body = (await response.json()) as {
      error?: {
        code?: string;
        message?: string;
        details?: {
          reason?: string;
          requestId?: string;
        };
      };
    };

    expect(response.status).toBe(503);
    expect(body.error).toEqual({
      code: "PROVIDER_UNAVAILABLE",
      message: "A required provider is unavailable. Please try again later.",
      details: {
        reason: "missing_db_binding",
        requestId: "req_missing_storage",
      },
    });
  });

  it("keeps generated request ID stable across context, error response, and logs", async () => {
    const logs: OperationalLogEvent[] = [];
    let routeRequestId: string | undefined;
    const app = createApp({
      operationalLogger: {
        record: (event) => logs.push(event),
      },
    }).get("/boom-generated", (ctx) => {
      routeRequestId = (ctx as typeof ctx & { requestId: string }).requestId;
      throw new Error("boom");
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/boom-generated")
    );
    const body = (await response.json()) as {
      error?: {
        details?: {
          requestId?: string;
        };
      };
    };

    expect(response.status).toBe(500);
    expect(routeRequestId).toMatch(/^req_/);
    expect(response.headers.get("x-request-id")).toBe(routeRequestId);
    expect(body.error?.details?.requestId).toBe(routeRequestId);
    expect(logs[0]?.requestId).toBe(routeRequestId);
  });

  it("does not let operational logger failures replace safe error responses", async () => {
    const app = createApp({
      operationalLogger: {
        record: () => {
          throw new Error("logger unavailable");
        },
      },
    }).get("/logger-fails", () => {
      throw new Error("original failure");
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/logger-fails", {
        headers: { "x-request-id": "req_logger_fails" },
      })
    );
    const body = (await response.json()) as {
      error?: {
        code?: string;
        details?: {
          requestId?: string;
        };
      };
    };

    expect(response.status).toBe(500);
    expect(body.error?.code).toBe("INTERNAL_ERROR");
    expect(body.error?.details?.requestId).toBe("req_logger_fails");
  });

  it("treats response contract validation failures as internal failures", async () => {
    const logs: OperationalLogEvent[] = [];
    const app = createApp({
      operationalLogger: {
        record: (event) => logs.push(event),
      },
    }).get(
      "/bad-response-contract",
      (ctx) =>
        ({
          data: {
            name: "wrong-shape",
          },
          meta: {
            requestId: (ctx as typeof ctx & { requestId: string }).requestId,
          },
        }) as never,
      {
        response: {
          200: tboxApiSuccess(
            t.Object({
              ok: t.Boolean(),
            })
          ),
        },
      }
    );

    const response = await app.handle(
      new Request("https://jrw.test/api/bad-response-contract", {
        headers: { "x-request-id": "req_bad_response" },
      })
    );
    const body = (await response.json()) as {
      error?: {
        code?: string;
        details?: {
          requestId?: string;
        };
      };
    };

    expect(response.status).toBe(500);
    expect(body.error?.code).toBe("INTERNAL_ERROR");
    expect(body.error?.details?.requestId).toBe("req_bad_response");
    expect(logs[0]?.errorCode).toBe("INTERNAL_ERROR");
  });
});
