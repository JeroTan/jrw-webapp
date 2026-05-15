import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import { AccountRecoveryController } from "@/server/controllers/AccountRecoveryController";
import type { AccountRecoveryServiceLike } from "@/server/controllers/AccountRecoveryController";
import { createApp } from "@/server/app";

function createController(
  service: Partial<AccountRecoveryServiceLike>
): AccountRecoveryController {
  return new AccountRecoveryController(service as AccountRecoveryServiceLike);
}

describe("account recovery routes", () => {
  it("documents password reset and verification resend endpoints", async () => {
    const app = createApp();
    const response = await app.handle(
      new Request("https://jrw.test/api/openapi/json")
    );
    const body = (await response.json()) as {
      paths?: Record<
        string,
        Record<
          string,
          {
            summary?: string;
            tags?: string[];
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            "x-error-codes"?: string[];
          }
        >
      >;
    };

    const requestReset = body.paths?.["/api/password-resets"]?.post;
    const confirmReset =
      body.paths?.["/api/password-resets/confirmations"]?.post;
    const resendVerification =
      body.paths?.["/api/email-verifications/requests"]?.post;

    expect(requestReset?.summary).toBe("Request password reset");
    expect(confirmReset?.summary).toBe("Confirm password reset");
    expect(resendVerification?.summary).toBe("Request verification email");
    expect(requestReset?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(requestReset?.["x-rate-limit-class"]).toBe("email-token");
    expect(confirmReset?.["x-rate-limit-class"]).toBe("email-token");
    expect(resendVerification?.["x-rate-limit-class"]).toBe("email-token");
    expect(confirmReset?.["x-error-codes"]).toEqual(
      expect.arrayContaining(["RESOURCE_NOT_FOUND", "CONFLICT_STATE"])
    );
  });

  it("returns standard non-enumerating envelopes from thin routes", async () => {
    const app = createApp({
      routes: {
        accountRecovery: {
          controllerFactory: () =>
            createController({
              requestPasswordReset: async () =>
                Result.okay({ accepted: true }),
              confirmPasswordReset: async () => Result.okay({ reset: true }),
              requestEmailVerification: async () =>
                Result.okay({ accepted: true }),
            }),
        },
      },
    });

    const requestReset = await app.handle(
      new Request("https://jrw.test/api/password-resets", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_reset",
        },
        body: JSON.stringify({ email: "buyer@example.test" }),
      })
    );
    const confirmReset = await app.handle(
      new Request("https://jrw.test/api/password-resets/confirmations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_confirm",
        },
        body: JSON.stringify({
          token: "raw-reset-token",
          password: "correct horse battery staple",
        }),
      })
    );
    const resendVerification = await app.handle(
      new Request("https://jrw.test/api/email-verifications/requests", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_resend",
        },
        body: JSON.stringify({ email: "buyer@example.test" }),
      })
    );

    await expect(requestReset.json()).resolves.toMatchObject({
      data: { accepted: true },
      meta: { requestId: "req_reset" },
    });
    await expect(confirmReset.json()).resolves.toMatchObject({
      data: { reset: true },
      meta: { requestId: "req_confirm" },
    });
    await expect(resendVerification.json()).resolves.toMatchObject({
      data: { accepted: true },
      meta: { requestId: "req_resend" },
    });
    expect(requestReset.status).toBe(202);
    expect(confirmReset.status).toBe(200);
    expect(resendVerification.status).toBe(202);
  });
});
