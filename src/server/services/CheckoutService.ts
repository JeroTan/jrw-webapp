import {
  validateCheckoutCart,
  validateCheckoutCartRequestItems,
  type CheckoutCartRequestItem,
  type CheckoutCartValidationSummary,
} from "@/domain/checkout/cart-validation";
import {
  validateCheckoutContactDetails,
  type CheckoutContactSnapshot,
} from "@/domain/checkout/contact-delivery";
import type { CheckoutRepository } from "@/server/repositories/CheckoutRepository";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type CheckoutCartValidationServiceInput = {
  body: unknown;
  requestId: string;
};

export type CheckoutDetailsActorInput = {
  authenticated: boolean;
  role: string;
  actorId?: string;
};

export type CheckoutDetailsServiceInput = {
  actor?: CheckoutDetailsActorInput;
  body: unknown;
  requestId: string;
};

export type CheckoutDetailsResult = {
  attempt: {
    attemptId: string;
    status: "DETAILS_CAPTURED";
  };
  customer: {
    customerId: string | null;
    mode: "guest" | "signed-in";
  };
  details: CheckoutContactSnapshot;
  next: {
    cartValidationRequired: true;
    paymentAllowed: false;
  };
};

export type CheckoutServiceOptions = {
  repository: CheckoutRepository;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : Number.NaN;
}

function variantOptionsFromValue(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const options = value
    .filter(isRecord)
    .map((option) => ({
      group: stringValue(option.group).trim(),
      name: stringValue(option.name).trim(),
    }))
    .filter((option) => option.group.length > 0 && option.name.length > 0);

  return options.length > 0 ? options : undefined;
}

function normalizeRequestItems(body: unknown):
  | { items: CheckoutCartRequestItem[]; reasons: [] }
  | { items: []; reasons: string[] } {
  if (!isRecord(body) || !Array.isArray(body.items)) {
    return {
      items: [],
      reasons: ["items:required"],
    };
  }

  const items = body.items.map((item): CheckoutCartRequestItem => {
    if (!isRecord(item)) {
      return {
        priceCentavos: Number.NaN,
        productId: "",
        productSlug: "",
        quantity: Number.NaN,
        variantId: "",
      };
    }

    return {
      priceCentavos: numberValue(item.priceCentavos),
      productId: stringValue(item.productId),
      ...(optionalString(item.productName)
        ? { productName: optionalString(item.productName) }
        : {}),
      productSlug: stringValue(item.productSlug),
      quantity: numberValue(item.quantity),
      variantId: stringValue(item.variantId),
      ...(optionalString(item.variantLabel)
        ? { variantLabel: optionalString(item.variantLabel) }
        : {}),
      ...(variantOptionsFromValue(item.variantOptions)
        ? { variantOptions: variantOptionsFromValue(item.variantOptions) }
        : {}),
    };
  });
  const reasons = validateCheckoutCartRequestItems(items);

  if (reasons.length > 0) {
    return { items: [], reasons };
  }

  return { items, reasons: [] };
}

function providerFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    /D1_|SQLITE_|database|query|constraint|prepare|execute|transaction|storage/i.test(
      error.message
    )
  );
}

export class CheckoutService {
  private readonly repository: CheckoutRepository;

  constructor(options: CheckoutServiceOptions) {
    this.repository = options.repository;
  }

  async validateCart(
    input: CheckoutCartValidationServiceInput
  ): Promise<AppResult<CheckoutCartValidationSummary>> {
    const normalized = normalizeRequestItems(input.body);

    if (normalized.reasons.length > 0) {
      return Result.error(
        new GeneralError({ reasons: normalized.reasons }, "VALIDATION_FAILED")
      );
    }

    try {
      const serverLines = await this.repository.findCartLines(normalized.items);
      const validation = validateCheckoutCart({
        items: normalized.items,
        serverLines,
      });

      if (validation.error) {
        return Result.error(
          new GeneralError(
            { reasons: validation.error.reasons },
            "VALIDATION_FAILED"
          )
        );
      }

      if (validation.summary.status === "CHANGED") {
        return Result.error(
          new GeneralError(validation.summary, "CONFLICT_STATE")
        );
      }

      if (validation.summary.status === "BLOCKED") {
        return Result.error(
          new GeneralError(validation.summary, "INVENTORY_UNAVAILABLE")
        );
      }

      return Result.okay(validation.summary);
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }

      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    }
  }

  async saveDetails(
    input: CheckoutDetailsServiceInput
  ): Promise<AppResult<CheckoutDetailsResult>> {
    const validation = validateCheckoutContactDetails(input.body);

    if (!validation.ok) {
      return Result.error(
        new GeneralError({ reasons: validation.reasons }, "VALIDATION_FAILED")
      );
    }

    const customerId =
      input.actor?.authenticated &&
      input.actor.role === "CUSTOMER" &&
      input.actor.actorId
        ? input.actor.actorId
        : null;

    try {
      const attempt = await this.repository.createCheckoutAttempt({
        customerId,
        details: validation.value,
        requestId: input.requestId,
      });

      return Result.okay({
        attempt: {
          attemptId: attempt.id,
          status: attempt.status,
        },
        customer: {
          customerId,
          mode: customerId ? "signed-in" : "guest",
        },
        details: validation.value,
        next: {
          cartValidationRequired: true,
          paymentAllowed: false,
        },
      });
    } catch {
      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    }
  }
}
