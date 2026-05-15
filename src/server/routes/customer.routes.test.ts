import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import { CustomerAccountController } from "@/server/controllers/CustomerAccountController";
import type { CustomerAccountServiceLike } from "@/server/controllers/CustomerAccountController";
import type { CustomerProfileDto } from "@/server/services/CustomerAccountService";
import { createApp } from "@/server/app";

function customerProfile(
  overrides: Partial<CustomerProfileDto> = {}
): CustomerProfileDto {
  return {
    id: "customer_1",
    email: "buyer@example.test",
    role: "CUSTOMER" as const,
    emailVerified: true,
    displayName: "Buyer",
    firstName: null,
    lastName: null,
    phone: null,
    streetAddress: null,
    barangay: null,
    cityProvince: null,
    postalCode: null,
    avatarUrl: null,
    emailMarketingOptIn: false,
    ...overrides,
  };
}

function createController(
  service: Partial<CustomerAccountServiceLike>
): CustomerAccountController {
  return new CustomerAccountController(service as CustomerAccountServiceLike);
}

describe("customer account routes", () => {
  it("documents customer account endpoints with OpenAPI metadata", async () => {
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
            description?: string;
            tags?: string[];
            "x-auth"?: { mode?: string; roles?: string[] };
            "x-rate-limit-class"?: string;
            "x-error-codes"?: string[];
          }
        >
      >;
    };

    const register = body.paths?.["/api/customers"]?.post;
    const verify = body.paths?.["/api/email-verifications"]?.post;
    const getProfile = body.paths?.["/api/customers/me"]?.get;
    const updateProfile = body.paths?.["/api/customers/me"]?.patch;

    expect(register?.summary).toBe("Register customer");
    expect(register?.description).toContain(
      "Only email and password are required for signup"
    );
    expect(register?.description).toContain("PATCH /customers/me");
    expect(register?.description).toContain("checkout contact/delivery step");
    expect(register?.tags).toContain("Customers");
    expect(register?.["x-auth"]).toEqual({
      mode: "public",
      roles: ["PROSPECT"],
    });
    expect(register?.["x-rate-limit-class"]).toBe("email-token");
    expect(register?.["x-error-codes"]).toEqual(
      expect.arrayContaining(["VALIDATION_FAILED", "PROVIDER_UNAVAILABLE"])
    );
    expect(verify?.["x-rate-limit-class"]).toBe("email-token");
    expect(getProfile?.["x-auth"]).toEqual({
      mode: "required",
      roles: ["CUSTOMER"],
    });
    expect(getProfile?.["x-rate-limit-class"]).toBe("public-read");
    expect(updateProfile?.["x-rate-limit-class"]).toBe("customer-write");
  });

  it("registers customer through thin route/controller boundary without exposing token", async () => {
    const app = createApp({
      routes: {
        customers: {
          controllerFactory: () =>
            createController({
              registerCustomer: async () =>
                Result.okay({
                  customer: customerProfile({ emailVerified: false }),
                  verificationEmail: { sent: true },
                }),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/customers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req_register",
        },
        body: JSON.stringify({
          email: "buyer@example.test",
          password: "correct horse battery staple",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      data: {
        customer: { id: "customer_1", role: "CUSTOMER" },
        verificationEmail: { sent: true },
      },
      meta: { requestId: "req_register" },
    });
    expect(JSON.stringify(body)).not.toContain("token");
    expect(JSON.stringify(body)).not.toContain("password");
  });

  it("reads and updates authenticated customer profile", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => ({
          authenticated: true,
          role: "CUSTOMER",
          actorId: "customer_1",
          safeActorId: "customer_1",
          accountStatus: {
            status: "ACTIVE",
            emailVerified: true,
            approved: true,
          },
          eligibility: {
            active: true,
            emailVerified: true,
            approved: true,
          },
        }),
      },
      routes: {
        customers: {
          controllerFactory: () =>
            createController({
              getProfile: async () => Result.okay(customerProfile()),
              updateProfile: async () =>
                Result.okay(customerProfile({ displayName: "New Buyer" })),
            }),
        },
      },
    });

    const getResponse = await app.handle(
      new Request("https://jrw.test/api/customers/me", {
        headers: {
          cookie: "jrw_session=test-session",
          "x-request-id": "req_get",
        },
      })
    );
    const patchResponse = await app.handle(
      new Request("https://jrw.test/api/customers/me", {
        method: "PATCH",
        headers: {
          cookie: "jrw_session=test-session",
          "content-type": "application/json",
          "x-request-id": "req_patch",
        },
        body: JSON.stringify({
          displayName: "New Buyer",
          phone: "0917 123 4567",
        }),
      })
    );

    await expect(getResponse.json()).resolves.toMatchObject({
      data: { id: "customer_1", email: "buyer@example.test" },
      meta: { requestId: "req_get" },
    });
    await expect(patchResponse.json()).resolves.toMatchObject({
      data: { displayName: "New Buyer" },
      meta: { requestId: "req_patch" },
    });
    expect(getResponse.status).toBe(200);
    expect(patchResponse.status).toBe(200);
  });

  it("rejects unsupported profile mutation fields before controller execution", async () => {
    const app = createApp({
      requestContext: {
        resolveActorFromSession: async () => ({
          authenticated: true,
          role: "CUSTOMER",
          actorId: "customer_1",
          safeActorId: "customer_1",
          accountStatus: {
            status: "ACTIVE",
            emailVerified: true,
            approved: true,
          },
          eligibility: {
            active: true,
            emailVerified: true,
            approved: true,
          },
        }),
      },
      routes: {
        customers: {
          controllerFactory: () =>
            createController({
              updateProfile: async () =>
                Result.okay(customerProfile({ role: "CUSTOMER" })),
            }),
        },
      },
    });

    const response = await app.handle(
      new Request("https://jrw.test/api/customers/me", {
        method: "PATCH",
        headers: {
          cookie: "jrw_session=test-session",
          "content-type": "application/json",
          "x-request-id": "req_bad_profile",
        },
        body: JSON.stringify({
          displayName: "Buyer",
          role: "ADMIN",
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: {
        code: "VALIDATION_FAILED",
        details: { requestId: "req_bad_profile" },
      },
    });
  });
});
