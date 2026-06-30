import {
  isTrustedPayMongoCheckoutUrl,
  type PayMongoCheckoutSessionPayload,
} from "@/domain/payments/paymongo-checkout";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type PayMongoCheckoutSessionResult = {
  checkoutUrl: string;
  livemode: boolean;
  providerCheckoutSessionId: string;
  status: string;
};

export type PayMongoCheckoutSessionPaymentStatusResult = {
  paid: boolean;
  providerCheckoutSessionId: string;
  providerPaymentId?: string;
  providerPaymentIntentId?: string;
  status: string;
};

export type PayMongoClientOptions = {
  checkoutSessionStatusEndpoint?: string;
  endpoint?: string;
  fetcher?: typeof fetch;
  secretKey: string;
  timeoutMs?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function basicAuth(secretKey: string) {
  return `Basic ${btoa(`${secretKey}:`)}`;
}

function cleanSecretKey(secretKey: string) {
  const trimmed = secretKey.trim();
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  return (first === `"` || first === `'`) && first === last
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

function providerErrorForStatus(status: number) {
  return status === 400 ? "PAYMENT_FAILED" : "PROVIDER_UNAVAILABLE";
}

const PAYMONGO_MINIMUM_AMOUNT_CENTAVOS = 100;

function checkoutPayloadTotalCentavos(
  payload: PayMongoCheckoutSessionPayload
): number {
  return payload.data.attributes.line_items.reduce(
    (total, item) => total + item.amount * item.quantity,
    0
  );
}

function providerFailureDetails(
  payload: PayMongoCheckoutSessionPayload
): Record<string, number> {
  const subtotalCentavos = checkoutPayloadTotalCentavos(payload);
  const details: Record<string, number> = {};

  if (subtotalCentavos < PAYMONGO_MINIMUM_AMOUNT_CENTAVOS) {
    details.minimumAmountCentavos = PAYMONGO_MINIMUM_AMOUNT_CENTAVOS;
    details.subtotalCentavos = subtotalCentavos;
  }

  return details;
}

function parseCheckoutSessionResponse(
  value: unknown
): PayMongoCheckoutSessionResult | null {
  if (!isRecord(value) || !isRecord(value.data)) {
    return null;
  }

  const data = value.data;
  const attributes = isRecord(data.attributes) ? data.attributes : null;
  const status =
    attributes && typeof attributes.status === "string"
      ? attributes.status
      : "active";

  if (
    typeof data.id !== "string" ||
    !attributes ||
    !isTrustedPayMongoCheckoutUrl(attributes.checkout_url) ||
    status !== "active"
  ) {
    return null;
  }

  return {
    checkoutUrl: attributes.checkout_url,
    livemode:
      typeof attributes.livemode === "boolean" ? attributes.livemode : false,
    providerCheckoutSessionId: data.id,
    status,
  };
}

function stringAt(
  value: Record<string, unknown> | null,
  key: string
): string | null {
  return cleanString(value?.[key]);
}

function recordAt(
  value: Record<string, unknown> | null,
  key: string
): Record<string, unknown> | null {
  const nested = value?.[key];

  return isRecord(nested) ? nested : null;
}

function paymentStatus(payment: Record<string, unknown>): string | null {
  return (
    stringAt(recordAt(payment, "attributes"), "status") ??
    stringAt(payment, "status")
  );
}

function parseCheckoutSessionPaymentStatusResponse(
  value: unknown
): PayMongoCheckoutSessionPaymentStatusResult | null {
  if (!isRecord(value) || !isRecord(value.data)) {
    return null;
  }

  const data = value.data;
  const attributes = isRecord(data.attributes) ? data.attributes : null;
  const providerCheckoutSessionId = cleanString(data.id);

  if (!providerCheckoutSessionId || !attributes) {
    return null;
  }

  const sessionStatus = stringAt(attributes, "status") ?? "unknown";
  const payments = attributes.payments;
  const paymentRows = Array.isArray(payments)
    ? payments.filter(isRecord)
    : [];
  const paidPayment =
    paymentRows.find((payment) => paymentStatus(payment) === "paid") ?? null;
  const firstPayment = paymentRows[0] ?? null;
  const providerPaymentId =
    stringAt(paidPayment, "id") ?? stringAt(firstPayment, "id") ?? undefined;
  const providerPaymentIntentId =
    stringAt(recordAt(attributes, "payment_intent"), "id") ??
    stringAt(attributes, "payment_intent_id") ??
    undefined;

  return {
    paid: Boolean(paidPayment),
    providerCheckoutSessionId,
    ...(providerPaymentId ? { providerPaymentId } : {}),
    ...(providerPaymentIntentId ? { providerPaymentIntentId } : {}),
    status: sessionStatus,
  };
}

export class PayMongoClient {
  private readonly checkoutSessionStatusEndpoint: string;
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly secretKey: string;
  private readonly timeoutMs: number;

  constructor(options: PayMongoClientOptions) {
    this.checkoutSessionStatusEndpoint =
      options.checkoutSessionStatusEndpoint ??
      "https://api.paymongo.com/v1/checkout_sessions";
    this.endpoint =
      options.endpoint ?? "https://api.paymongo.com/v2/checkout_sessions";
    this.fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
    this.secretKey = cleanSecretKey(options.secretKey);
    this.timeoutMs =
      typeof options.timeoutMs === "number" &&
      Number.isSafeInteger(options.timeoutMs) &&
      options.timeoutMs > 0
        ? Math.min(options.timeoutMs, 4_294_967_295)
        : 15_000;
  }

  async createCheckoutSession(
    payload: PayMongoCheckoutSessionPayload
  ): Promise<AppResult<PayMongoCheckoutSessionResult>> {
    if (!this.secretKey) {
      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    }

    return this.createCheckoutSessionRequest(payload);
  }

  async getCheckoutSessionPaymentStatus(
    providerCheckoutSessionId: string
  ): Promise<AppResult<PayMongoCheckoutSessionPaymentStatusResult>> {
    const checkoutSessionId = cleanString(providerCheckoutSessionId);

    if (!this.secretKey || !checkoutSessionId) {
      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    }

    try {
      const response = await this.fetcher(
        `${this.checkoutSessionStatusEndpoint}/${encodeURIComponent(
          checkoutSessionId
        )}`,
        {
          headers: {
            Accept: "application/json",
            Authorization: basicAuth(this.secretKey),
          },
          method: "GET",
          signal: AbortSignal.timeout(this.timeoutMs),
        }
      );

      if (!response.ok) {
        return Result.error(
          new GeneralError(
            {
              providerStatus: response.status,
              reason: "provider_http_error",
            },
            "PROVIDER_UNAVAILABLE"
          )
        );
      }

      const parsed = parseCheckoutSessionPaymentStatusResponse(
        await response.json()
      );

      return parsed
        ? Result.okay(parsed)
        : Result.error(
            new GeneralError(
              { reason: "provider_response_invalid" },
              "PROVIDER_UNAVAILABLE"
            )
          );
    } catch (error) {
      return Result.error(
        new GeneralError(
          { reason: "provider_fetch_failed" },
          "PROVIDER_UNAVAILABLE"
        )
      );
    }
  }

  private async createCheckoutSessionRequest(
    payload: PayMongoCheckoutSessionPayload
  ): Promise<AppResult<PayMongoCheckoutSessionResult>> {
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: basicAuth(this.secretKey),
        "Content-Type": "application/json",
      };

      const response = await this.fetcher(this.endpoint, {
        body: JSON.stringify(payload),
        headers,
        method: "POST",
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        return Result.error(
          new GeneralError(
            {
              ...providerFailureDetails(payload),
              providerStatus: response.status,
              reason: "provider_http_error",
            },
            providerErrorForStatus(response.status)
          )
        );
      }

      const parsed = parseCheckoutSessionResponse(await response.json());

      return parsed
        ? Result.okay(parsed)
        : Result.error(
            new GeneralError(
              { reason: "provider_response_invalid" },
              "PROVIDER_UNAVAILABLE"
            )
          );
    } catch (error) {
      return Result.error(
        new GeneralError(
          { reason: "provider_fetch_failed" },
          "PROVIDER_UNAVAILABLE"
        )
      );
    }
  }
}
