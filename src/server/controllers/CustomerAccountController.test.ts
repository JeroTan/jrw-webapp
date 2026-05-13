import { describe, expect, it } from "vitest";
import { Result } from "@/utils/general/result";
import {
  CustomerAccountController,
  type CustomerAccountServiceLike,
} from "./CustomerAccountController";

function createController(
  service: Partial<CustomerAccountServiceLike>
): CustomerAccountController {
  return new CustomerAccountController(service as CustomerAccountServiceLike);
}

describe("CustomerAccountController", () => {
  it("maps registration result to safe success envelope", async () => {
    const controller = createController({
      registerCustomer: async () =>
        Result.okay({
          customer: {
            id: "customer_1",
            email: "buyer@example.test",
            role: "CUSTOMER",
            emailVerified: false,
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
          },
          verificationEmail: { sent: true },
        }),
    });

    const result = await controller.registerCustomer({
      body: {
        email: "buyer@example.test",
        password: "correct horse battery staple",
      },
      requestId: "req_register",
    });

    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({
      data: {
        customer: { id: "customer_1", role: "CUSTOMER" },
        verificationEmail: { sent: true },
      },
      meta: { requestId: "req_register" },
    });
    expect(JSON.stringify(result.body)).not.toContain("password");
    expect(JSON.stringify(result.body)).not.toContain("token");
  });

  it("maps service errors to public error envelopes", async () => {
    const controller = createController({
      verifyEmail: async () =>
        Result.error({
          code: "CONFLICT_STATE",
          data: {},
          message: "used token",
        }),
    });

    const result = await controller.verifyEmail({
      body: { token: "raw-token" },
      requestId: "req_verify",
    });

    expect(result.status).toBe(409);
    expect(result.body).toEqual({
      error: {
        code: "CONFLICT_STATE",
        message: "The request conflicts with the current state.",
        details: { requestId: "req_verify" },
      },
    });
    expect(JSON.stringify(result.body)).not.toContain("raw-token");
  });
});
