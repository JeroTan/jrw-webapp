import { describe, expect, it } from "vitest";
import { routeDetail } from "./route-metadata";

describe("route metadata helper", () => {
  it("builds OpenAPI operation detail with safe auth, rate limit, and error metadata", () => {
    expect(
      routeDetail({
        summary: "API foundation",
        description: "Reports API ownership.",
        tags: ["Foundation"],
        auth: {
          mode: "public",
          roles: ["PROSPECT"],
        },
        rateLimitClass: "public-read",
        errorCodes: ["INTERNAL_ERROR"],
      })
    ).toEqual({
      summary: "API foundation",
      description: "Reports API ownership.",
      tags: ["Foundation"],
      "x-auth": {
        mode: "public",
        roles: ["PROSPECT"],
      },
      "x-rate-limit-class": "public-read",
      "x-error-codes": ["INTERNAL_ERROR"],
    });
  });
});
