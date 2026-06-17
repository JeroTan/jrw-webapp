import type { PayMongoCheckoutSessionPayload } from "@/domain/payments/paymongo-checkout";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type PayMongoCheckoutSessionResult = {
  checkoutUrl: string;
  livemode: boolean;
  providerCheckoutSessionId: string;
  status: string;
};

export type PayMongoClientOptions = {
  endpoint?: string;
  fetcher?: typeof fetch;
  proxyEndpoint?: string;
  secretKey: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  payload: PayMongoCheckoutSessionPayload,
  status?: number
): Record<string, boolean | number> {
  const subtotalCentavos = checkoutPayloadTotalCentavos(payload);
  const details: Record<string, boolean | number> =
    typeof status === "number" ? { providerStatus: status } : {};

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

  if (
    typeof data.id !== "string" ||
    !attributes ||
    typeof attributes.checkout_url !== "string"
  ) {
    return null;
  }

  return {
    checkoutUrl: attributes.checkout_url,
    livemode:
      typeof attributes.livemode === "boolean" ? attributes.livemode : false,
    providerCheckoutSessionId: data.id,
    status:
      typeof attributes.status === "string" ? attributes.status : "active",
  };
}

export class PayMongoClient {
  private readonly endpoint: string;
  private readonly fetcher: typeof fetch;
  private readonly proxyEndpoint?: string;
  private readonly secretKey: string;

  constructor(options: PayMongoClientOptions) {
    this.endpoint =
      options.endpoint ?? "https://api.paymongo.com/v2/checkout_sessions";
    this.fetcher = options.fetcher ?? fetch;
    this.proxyEndpoint = options.proxyEndpoint;
    this.secretKey = cleanSecretKey(options.secretKey);
  }

  async createCheckoutSession(
    payload: PayMongoCheckoutSessionPayload
  ): Promise<AppResult<PayMongoCheckoutSessionResult>> {
    if (!this.secretKey) {
      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    }

    return this.createCheckoutSessionRequest(payload);
  }

  private async createCheckoutSessionRequest(
    payload: PayMongoCheckoutSessionPayload
  ): Promise<AppResult<PayMongoCheckoutSessionResult>> {
    try {
      const useProxy = Boolean(this.proxyEndpoint);
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      if (!useProxy) {
        headers.Authorization = basicAuth(this.secretKey);
      }

      const response = await this.fetcher(this.proxyEndpoint ?? this.endpoint, {
        body: JSON.stringify(payload),
        headers,
        method: "POST",
      });

      if (!response.ok) {
        return Result.error(
          new GeneralError(
            providerFailureDetails(payload, response.status),
            providerErrorForStatus(response.status)
          )
        );
      }

      const parsed = parseCheckoutSessionResponse(await response.json());

      return parsed
        ? Result.okay(parsed)
        : Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    } catch {
      return Result.error(
        new GeneralError({ networkFailure: true }, "PROVIDER_UNAVAILABLE")
      );
    }
  }
}
