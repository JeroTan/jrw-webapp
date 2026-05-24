import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";
import type {
  ProductPublishReadinessSnapshot,
  ProductReadinessResult,
  ProductStatus,
  ProductStatusTransitionInput,
} from "./types";

const allowedTransitions: Record<ProductStatus, readonly ProductStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: [],
};

function conflictError(
  reason: string,
  details: Record<string, unknown> = {}
): GeneralError {
  return new GeneralError(
    {
      reason,
      ...details,
    },
    "CONFLICT_STATE"
  );
}

export function evaluateProductPublishReadiness(
  snapshot: ProductPublishReadinessSnapshot
): ProductReadinessResult {
  const missingItems: string[] = [];

  if (!snapshot.hasName) {
    missingItems.push("Product name is required.");
  }

  if (!snapshot.hasSlug) {
    missingItems.push("Product slug is required.");
  }

  if (snapshot.categoryCount <= 0) {
    missingItems.push("At least one category assignment is required.");
  }

  if (snapshot.variantCount <= 0) {
    missingItems.push("At least one active variant is required.");
  }

  if (snapshot.variantsMissingSkuCount > 0) {
    missingItems.push("Every active variant must include SKU.");
  }

  if (snapshot.variantsMissingPriceCount > 0) {
    missingItems.push(
      "Every active variant must have price greater than zero."
    );
  }

  if (snapshot.variantCount > 0 && snapshot.availableVariantCount <= 0) {
    missingItems.push(
      "At least one active variant must be in stock or preorder."
    );
  }

  return {
    isReady: missingItems.length === 0,
    missingItems,
  };
}

export function validateProductStatusTransition(
  input: ProductStatusTransitionInput
): AppResult<null> {
  if (input.currentStatus === input.nextStatus) {
    return Result.error(
      conflictError("ALREADY_IN_STATE", {
        currentStatus: input.currentStatus,
      })
    );
  }

  const nextStates = allowedTransitions[input.currentStatus];
  if (!nextStates.includes(input.nextStatus)) {
    return Result.error(
      conflictError(
        input.currentStatus === "ARCHIVED"
          ? "STATUS_TERMINAL"
          : "INVALID_STATUS_TRANSITION",
        {
          currentStatus: input.currentStatus,
          nextStatus: input.nextStatus,
        }
      )
    );
  }

  return Result.okay(null);
}
