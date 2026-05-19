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
  it("documents realm-specific password reset and customer verification endpoints", async () => {
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

    const customerRequest =
      body.paths?.["/api/customer/auth/password-resets"]?.post;
    const customerConfirm =
      body.paths?.["/api/customer/auth/password-resets/confirmations"]?.post;
    const adminRequest = body.paths?.["/api/admin/auth/password-resets"]?.post;
    const resendVerification =
      body.paths?.["/api/customer/auth/email-verifications/requests"]?.post;

    expect(body.paths?.["/api/password-resets"]).toBeUndefined();
    expect(customerRequest?.summary).toBe("Request customer password reset");
    expect(customerConfirm?.summary).toBe("Confirm customer password reset");
    expect(adminRequest?.summary).toBe("Request admin password reset");
    expect(resendVerification?.summary).toBe(
      "Request customer verification email"
    );
    expect(customerRequest?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(customerRequest?.["x-rate-limit-class"]).toBe("email-token");
    expect(customerConfirm?.["x-rate-limit-class"]).toBe("email-token");
    expect(resendVerification?.["x-rate-limit-class"]).toBe("email-token");
    expect(customerConfirm?.["x-error-codes"]).toEqual(
      expect.arrayContaining(["RESOURCE_NOT_FOUND", "CONFLICT_STATE"])
    );
  });

  it("routes account recovery calls through selected identity realm", async () => {
    const realms: string[] = [];
    const app = createApp({
      routes: {
        accountRecovery: {
          controllerFactory: ({ realm }) => {
            realms.push(realm);
            return createController({
              requestPasswordReset: async () =>
                Result.okay({ accepted: true }),
              confirmPasswordReset: async () => Result.okay({ reset: true }),
              requestEmailVerification: async () =>
                Result.okay({ accepted: true }),
            });
          },
        },
      },
    });

    const requestReset = await app.handle(
      new Request("https://jrw.test/api/customer/auth/password-resets", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_reset",
        },
        body: JSON.stringify({ email: "buyer@example.test" }),
      })
    );
    const adminReset = await app.handle(
      new Request("https://jrw.test/api/admin/auth/password-resets", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_admin_reset",
        },
        body: JSON.stringify({ email: "owner@example.test" }),
      })
    );
    const confirmReset = await app.handle(
      new Request(
        "https://jrw.test/api/customer/auth/password-resets/confirmations",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_confirm",
          },
          body: JSON.stringify({
            token: "raw-reset-token",
            password: "correct horse battery staple",
          }),
        }
      )
    );
    const resendVerification = await app.handle(
      new Request(
        "https://jrw.test/api/customer/auth/email-verifications/requests",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_resend",
          },
          body: JSON.stringify({ email: "buyer@example.test" }),
        }
      )
    );

    await expect(requestReset.json()).resolves.toMatchObject({
      data: { accepted: true },
      meta: { requestId: "req_reset" },
    });
    await expect(adminReset.json()).resolves.toMatchObject({
      data: { accepted: true },
      meta: { requestId: "req_admin_reset" },
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
    expect(adminReset.status).toBe(202);
    expect(confirmReset.status).toBe(200);
    expect(resendVerification.status).toBe(202);
    expect(realms).toEqual(["CUSTOMER", "ADMIN", "CUSTOMER", "CUSTOMER"]);
  });
});
