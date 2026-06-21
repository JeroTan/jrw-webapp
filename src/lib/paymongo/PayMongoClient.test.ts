import { describe, expect, it, vi } from "vitest";
import { PayMongoClient } from "./PayMongoClient";

const checkoutPayload = {
  data: {
    attributes: {
      cancel_url: "https://jrw.test/checkout",
      currency: "PHP",
      line_items: [
        {
          amount: 1999,
          currency: "PHP",
          name: "Linen Shirt",
          quantity: 2,
        },
      ],
      metadata: {
        checkout_attempt_id: "attempt_123",
        payment_id: "payment_123",
        reservation_id: "reservation_123",
      },
      payment_method_types: ["card"],
      reference_number: "JRW-payment_123",
      send_email_receipt: false,
      success_url: "https://jrw.test/checkout/payment-return",
    },
  },
} as const;

describe("PayMongoClient", () => {
  it("creates Hosted Checkout V2 with backend-only Basic auth", async () => {
    let capturedUrl = "";
    let capturedAuth = "";
    let capturedBody: unknown;
    const client = new PayMongoClient({
      fetcher: async (url, init) => {
        capturedUrl = String(url);
        capturedAuth = String(
          (init?.headers as Record<string, string>).Authorization
        );
        capturedBody = JSON.parse(String(init?.body));

        return new Response(
          JSON.stringify({
            data: {
              id: "cs_test_123",
              type: "checkout_session",
              attributes: {
                checkout_url: "https://checkout.paymongo.com/cs_test_123",
                livemode: false,
                status: "active",
              },
            },
          }),
          { status: 200 }
        );
      },
      secretKey: "sk_test_secret_123",
    });

    const result = await client.createCheckoutSession(checkoutPayload);

    expect(result.error).toBeNull();
    expect(capturedUrl).toBe("https://api.paymongo.com/v2/checkout_sessions");
    expect(capturedAuth).toBe(`Basic ${btoa("sk_test_secret_123:")}`);
    expect(capturedBody).toEqual(checkoutPayload);
    expect(result.content).toEqual({
      checkoutUrl: "https://checkout.paymongo.com/cs_test_123",
      livemode: false,
      providerCheckoutSessionId: "cs_test_123",
      status: "active",
    });
  });

  it("always uses backend endpoint and Basic auth", async () => {
    let capturedUrl = "";
    let capturedAuth: unknown = "not-called";
    const client = new PayMongoClient({
      fetcher: async (url, init) => {
        capturedUrl = String(url);
        capturedAuth = (init?.headers as Record<string, string>).Authorization;

        return new Response(
          JSON.stringify({
            data: {
              id: "cs_test_proxy_123",
              type: "checkout_session",
              attributes: {
                checkout_url: "https://checkout.paymongo.com/cs_test_proxy_123",
                livemode: false,
                status: "active",
              },
            },
          }),
          { status: 200 }
        );
      },
      secretKey: "sk_test_secret_123",
    });

    const result = await client.createCheckoutSession(checkoutPayload);

    expect(result.error).toBeNull();
    expect(capturedUrl).toBe(
      "https://api.paymongo.com/v2/checkout_sessions"
    );
    expect(capturedAuth).toBe(`Basic ${btoa("sk_test_secret_123:")}`);
    expect(result.content?.providerCheckoutSessionId).toBe("cs_test_proxy_123");
  });

  it("wraps default global fetch for Workers-compatible invocation", async () => {
    const originalFetch = globalThis.fetch;
    let fetchThis: unknown;

    vi.stubGlobal("fetch", function (this: unknown) {
      fetchThis = this;

      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              id: "cs_test_global_fetch",
              type: "checkout_session",
              attributes: {
                checkout_url:
                  "https://checkout.paymongo.com/cs_test_global_fetch",
                livemode: false,
              },
            },
          }),
          { status: 200 }
        )
      );
    } as typeof fetch);

    try {
      const client = new PayMongoClient({
        secretKey: "sk_test_secret_123",
      });

      const result = await client.createCheckoutSession(checkoutPayload);

      expect(result.error).toBeNull();
      expect(fetchThis).not.toBe(client);
      expect(result.content?.providerCheckoutSessionId).toBe(
        "cs_test_global_fetch"
      );
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("trims matching quote wrappers from env-style secret values", async () => {
    let capturedAuth = "";
    const client = new PayMongoClient({
      fetcher: async (_url, init) => {
        capturedAuth = String(
          (init?.headers as Record<string, string>).Authorization
        );

        return new Response(
          JSON.stringify({
            data: {
              id: "cs_test_123",
              type: "checkout_session",
              attributes: {
                checkout_url: "https://checkout.paymongo.com/cs_test_123",
              },
            },
          }),
          { status: 200 }
        );
      },
      secretKey: `"sk_test_secret_123"`,
    });

    const result = await client.createCheckoutSession(checkoutPayload);

    expect(result.error).toBeNull();
    expect(capturedAuth).toBe(`Basic ${btoa("sk_test_secret_123:")}`);
  });

  it("maps invalid provider responses without leaking secret or payload", async () => {
    const client = new PayMongoClient({
      fetcher: async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                detail: "secret sk_test_secret_123 failed",
              },
            ],
          }),
          { status: 401 }
        ),
      secretKey: "sk_test_secret_123",
    });

    const result = await client.createCheckoutSession(checkoutPayload);

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
    expect(JSON.stringify(result.error)).not.toMatch(
      /sk_test_secret_123|checkout\.paymongo|line_items|Authorization/i
    );
  });

  it("rejects missing checkout URLs as provider unavailable", async () => {
    const client = new PayMongoClient({
      fetcher: async () =>
        new Response(
          JSON.stringify({
            data: {
              id: "cs_missing_url",
              type: "checkout_session",
              attributes: {
                livemode: false,
              },
            },
          }),
          { status: 200 }
        ),
      secretKey: "sk_test_secret_123",
    });

    const result = await client.createCheckoutSession(checkoutPayload);

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("rejects untrusted checkout URLs before persistence or redirect", async () => {
    const client = new PayMongoClient({
      fetcher: async () =>
        new Response(
          JSON.stringify({
            data: {
              id: "cs_bad",
              attributes: {
                checkout_url: "https://evil.example/cs_bad",
                livemode: false,
                status: "active",
              },
            },
          }),
          { status: 200 }
        ),
      secretKey: "sk_test_secret_123",
    });

    const result = await client.createCheckoutSession(checkoutPayload);

    expect(result.error?.code).toBe("PROVIDER_UNAVAILABLE");
    expect(result.content).toBeNull();
  });
});
