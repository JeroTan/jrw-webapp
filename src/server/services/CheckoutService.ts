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
import {
  checkoutReservationExpiresAt,
  decideCheckoutReservationRetry,
  planCheckoutReservation,
  toCheckoutReservationResponse,
  type CheckoutReservationPlanLine,
  type CheckoutReservationResponse,
} from "@/domain/checkout/inventory-reservation";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  verifyOpaqueToken,
} from "@/lib/crypto/opaque-token";
import type {
  CheckoutAttemptRecord,
  CheckoutRepository,
} from "@/server/repositories/CheckoutRepository";
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

export type CheckoutReservationServiceInput = {
  actor?: CheckoutDetailsActorInput;
  attemptId: string;
  body: unknown;
  now?: string;
  requestId: string;
};

export type CheckoutDetailsResult = {
  attempt: {
    attemptId: string;
    attemptToken: string;
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
  reservationExecutor?: CheckoutReservationExecutor;
};

export type CheckoutReservationExecutor = (
  input: CheckoutReservationServiceInput
) => Promise<AppResult<CheckoutReservationResponse>>;

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

function extractAttemptToken(body: unknown): string | null {
  if (!isRecord(body) || typeof body.attemptToken !== "string") {
    return null;
  }

  const attemptToken = body.attemptToken.trim();
  return attemptToken.length > 0 ? attemptToken : null;
}

function reservationRejectedFields(body: unknown): string[] {
  if (!isRecord(body)) {
    return [];
  }

  const rejected = [
    "customerId",
    "checkoutEmail",
    "paymentStatus",
    "orderStatus",
    "reservationStatus",
    "providerData",
    "payMongo",
    "paymentPayload",
  ];

  return rejected
    .filter((field) => field in body)
    .map((field) => `${field}:unknown`);
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
  private readonly reservationExecutor?: CheckoutReservationExecutor;
  private readonly repository: CheckoutRepository;

  constructor(options: CheckoutServiceOptions) {
    this.repository = options.repository;
    this.reservationExecutor = options.reservationExecutor;
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
      const attemptToken = generateOpaqueToken();
      const attempt = await this.repository.createCheckoutAttempt({
        attemptTokenHash: await hashOpaqueToken(attemptToken),
        customerId,
        details: validation.value,
        requestId: input.requestId,
      });

      return Result.okay({
        attempt: {
          attemptId: attempt.id,
          attemptToken,
          status: "DETAILS_CAPTURED",
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

  async reserveInventory(
    input: CheckoutReservationServiceInput
  ): Promise<AppResult<CheckoutReservationResponse>> {
    if (this.reservationExecutor) {
      return this.reservationExecutor(input);
    }

    try {
      const attempt = await this.repository.findCheckoutAttempt(input.attemptId);

      if (!attempt) {
        return Result.error(new GeneralError({}, "RESOURCE_NOT_FOUND"));
      }

      const authorization = await this.authorizeReservationAttempt(
        attempt,
        input
      );

      if (authorization.error) {
        return authorization;
      }

      const rejectedFields = reservationRejectedFields(input.body);

      if (rejectedFields.length > 0) {
        return Result.error(
          new GeneralError({ reasons: rejectedFields }, "VALIDATION_FAILED")
        );
      }

      const normalized = normalizeRequestItems(input.body);

      if (normalized.reasons.length > 0) {
        return Result.error(
          new GeneralError({ reasons: normalized.reasons }, "VALIDATION_FAILED")
        );
      }

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

      const plan = planCheckoutReservation(validation.summary);

      if (!plan.ok) {
        return Result.error(new GeneralError(plan.summary, plan.code));
      }

      const activeReservation =
        await this.repository.findActiveReservationForAttempt(attempt.id);
      const retryDecision = decideCheckoutReservationRetry({
        activeReservationFingerprint: activeReservation?.cartFingerprint ?? null,
        requestedFingerprint: plan.fingerprint,
      });

      if (retryDecision === "reuse" && activeReservation) {
        return Result.okay(
          toCheckoutReservationResponse({
            attemptId: attempt.id,
            cart: validation.summary,
            expiresAt: activeReservation.expiresAt,
            reservationId: activeReservation.id,
          })
        );
      }

      if (retryDecision === "conflict") {
        return Result.error(new GeneralError({}, "IDEMPOTENCY_CONFLICT"));
      }

      if (
        attempt.status === "INVENTORY_RESERVED" ||
        (attempt.status !== "DETAILS_CAPTURED" &&
          attempt.status !== "RESERVATION_FAILED")
      ) {
        return Result.error(new GeneralError({}, "CONFLICT_STATE"));
      }

      const reservedLines: CheckoutReservationPlanLine[] = [];

      for (const line of plan.lines) {
        const reserved = await this.repository.reserveStockLine(line);

        if (!reserved) {
          await this.releaseReservedLines(reservedLines);
          await this.repository.failReservationAndAttempt({
            attemptId: attempt.id,
            now: input.now,
            requestId: input.requestId,
          });

          return Result.error(
            new GeneralError(validation.summary, "INVENTORY_UNAVAILABLE")
          );
        }

        reservedLines.push(line);
      }

      const expiresAt = checkoutReservationExpiresAt(
        input.now ? new Date(input.now) : new Date()
      );

      try {
        const reservation = await this.repository.createCheckoutReservation({
          attemptId: attempt.id,
          cartFingerprint: plan.fingerprint,
          expiresAt,
          lines: plan.lines,
          now: input.now,
          requestId: input.requestId,
          subtotalCentavos: plan.subtotalCentavos,
        });

        return Result.okay(
          toCheckoutReservationResponse({
            attemptId: attempt.id,
            cart: validation.summary,
            expiresAt: reservation.expiresAt,
            reservationId: reservation.id,
          })
        );
      } catch (error) {
        await this.releaseReservedLines(reservedLines);
        const activeAfterConflict =
          await this.repository.findActiveReservationForAttempt(attempt.id);

        if (activeAfterConflict?.cartFingerprint === plan.fingerprint) {
          return Result.okay(
            toCheckoutReservationResponse({
              attemptId: attempt.id,
              cart: validation.summary,
              expiresAt: activeAfterConflict.expiresAt,
              reservationId: activeAfterConflict.id,
            })
          );
        }

        if (providerFailure(error)) {
          return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
        }

        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }
    } catch (error) {
      if (providerFailure(error)) {
        return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
      }

      return Result.error(new GeneralError({}, "PROVIDER_UNAVAILABLE"));
    }
  }

  private async authorizeReservationAttempt(
    attempt: CheckoutAttemptRecord,
    input: CheckoutReservationServiceInput
  ): Promise<AppResult<null>> {
    if (attempt.customerId) {
      const allowed =
        input.actor?.authenticated &&
        input.actor.role === "CUSTOMER" &&
        input.actor.actorId === attempt.customerId;

      return allowed
        ? Result.okay(null)
        : Result.error(new GeneralError({}, "AUTH_FORBIDDEN"));
    }

    const attemptToken = extractAttemptToken(input.body);

    if (!attemptToken) {
      return Result.error(new GeneralError({}, "AUTH_FORBIDDEN"));
    }

    return (await verifyOpaqueToken(attemptToken, attempt.attemptTokenHash))
      ? Result.okay(null)
      : Result.error(new GeneralError({}, "AUTH_FORBIDDEN"));
  }

  private async releaseReservedLines(
    lines: CheckoutReservationPlanLine[]
  ): Promise<void> {
    for (const line of lines.reverse()) {
      try {
        await this.repository.releaseStockLine(line);
      } catch {
        // Best-effort cleanup. Caller maps original failure safely.
      }
    }
  }
}
