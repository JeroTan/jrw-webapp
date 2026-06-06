import {
  STOREFRONT_CART_LINE_QUANTITY_MAX,
  type CartAvailabilityStatus,
  type CartVariantOption,
} from "./cart";
import { formatCatalogPrice } from "@/domain/products/price-format";
import {
  SNAPSHOT_VARIANT_OPTION_MAX_ITEMS,
  SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH,
} from "@/domain/snapshots/schemas";
import type {
  AvailabilityLabel,
  InventoryState,
  ProductStatus,
  ProductVariantStatus,
} from "@/domain/products/types";

export const STOREFRONT_CART_LINE_ITEM_MAX = 50;

export type CheckoutCartRequestItem = {
  priceCentavos: number;
  productId: string;
  productName?: string;
  productSlug: string;
  quantity: number;
  variantId: string;
  variantLabel?: string;
  variantOptions?: CartVariantOption[];
};

export type CheckoutCartServerLine = {
  availabilityLabel: AvailabilityLabel;
  imageAlt?: string;
  imageSrc?: string;
  inventoryState: InventoryState;
  priceCentavos: number;
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: ProductStatus;
  stockQuantity: number;
  variantId: string;
  variantLabel: string;
  variantOptions: CartVariantOption[];
  variantProductId: string;
  variantStatus: ProductVariantStatus;
};

export type CheckoutCartValidationStatus = "VALID" | "CHANGED" | "BLOCKED";

export type CheckoutCartIssueCode =
  | "CART_EMPTY"
  | "ITEM_INVALID"
  | "PRODUCT_UNAVAILABLE"
  | "VARIANT_UNAVAILABLE"
  | "PRICE_CHANGED"
  | "QUANTITY_REDUCED"
  | "QUANTITY_UNAVAILABLE"
  | "PRODUCT_VARIANT_MISMATCH";

export type CheckoutCartLineRecoveryStatus =
  | "READY"
  | "PRICE_CHANGED"
  | "QUANTITY_REDUCED"
  | "BLOCKED";

export type CheckoutCartValidationIssue = {
  code: CheckoutCartIssueCode;
  message: string;
  productId?: string;
  variantId?: string;
};

export type ValidatedCartLine = {
  availabilityLabel: AvailabilityLabel | "Unavailable";
  availabilityStatus: CartAvailabilityStatus;
  imageAlt?: string;
  imageSrc?: string;
  lineSubtotalCentavos: number;
  lineSubtotalLabel: string;
  maxQuantity: number;
  priceCentavos: number;
  priceLabel: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  reason?: string;
  recoveryStatus: CheckoutCartLineRecoveryStatus;
  suggestedAction?: string;
  variantId: string;
  variantLabel: string;
  variantOptions: CartVariantOption[];
};

export type CheckoutCartValidationSummary = {
  issues: CheckoutCartValidationIssue[];
  items: ValidatedCartLine[];
  lineItemCount: number;
  requiresCustomerAcceptance: boolean;
  status: CheckoutCartValidationStatus;
  subtotalCentavos: number;
  subtotalLabel: string;
  totalQuantity: number;
};

export type CheckoutCartValidationError = {
  code: "VALIDATION_FAILED";
  reasons: string[];
};

export type CheckoutCartValidationResult =
  | { error: CheckoutCartValidationError; summary: null }
  | { error: null; summary: CheckoutCartValidationSummary };

type LineValidationState = {
  issues: CheckoutCartValidationIssue[];
  line: ValidatedCartLine;
  status: CheckoutCartValidationStatus;
};

function cleanText(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function lineKey(productId: string, variantId: string): string {
  return `${productId}::${variantId}`;
}

function isSellableInventoryState(state: InventoryState): boolean {
  return state === "IN_STOCK" || state === "LOW_STOCK" || state === "PREORDER";
}

function maxQuantityForServerLine(line: CheckoutCartServerLine): number {
  if (
    line.productStatus !== "PUBLISHED" ||
    line.variantStatus !== "ACTIVE" ||
    line.variantProductId !== line.productId ||
    !isSellableInventoryState(line.inventoryState)
  ) {
    return 0;
  }

  if (line.stockQuantity > 0) {
    return Math.min(
      Math.trunc(line.stockQuantity),
      STOREFRONT_CART_LINE_QUANTITY_MAX
    );
  }

  return line.inventoryState === "PREORDER"
    ? STOREFRONT_CART_LINE_QUANTITY_MAX
    : 0;
}

export function validateCheckoutCartRequestItems(
  items: CheckoutCartRequestItem[]
): string[] {
  const reasons: string[] = [];

  if (items.length === 0) {
    reasons.push("cart:empty");
    return reasons;
  }

  if (items.length > STOREFRONT_CART_LINE_ITEM_MAX) {
    reasons.push("cart:too_many_items");
    return reasons;
  }

  const seenLineKeys = new Set<string>();

  items.forEach((item, index) => {
    const prefix = `items[${index}]`;
    const cleanProductId = cleanText(item.productId);
    const cleanVariantId = cleanText(item.variantId);

    if (!cleanProductId) {
      reasons.push(`${prefix}.productId:invalid_value`);
    }

    if (!cleanText(item.productSlug)) {
      reasons.push(`${prefix}.productSlug:invalid_value`);
    }

    if (!cleanVariantId) {
      reasons.push(`${prefix}.variantId:invalid_value`);
    }

    if (cleanProductId && cleanVariantId) {
      const key = lineKey(cleanProductId, cleanVariantId);

      if (seenLineKeys.has(key)) {
        reasons.push(`${prefix}:duplicate_item`);
      } else {
        seenLineKeys.add(key);
      }
    }

    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > STOREFRONT_CART_LINE_QUANTITY_MAX
    ) {
      reasons.push(`${prefix}.quantity:invalid_value`);
    }

    if (!Number.isInteger(item.priceCentavos) || item.priceCentavos < 0) {
      reasons.push(`${prefix}.priceCentavos:invalid_value`);
    }

    if (item.variantOptions) {
      if (item.variantOptions.length > SNAPSHOT_VARIANT_OPTION_MAX_ITEMS) {
        reasons.push(`${prefix}.variantOptions:too_many_items`);
      }

      item.variantOptions.forEach((option, optionIndex) => {
        const optionPrefix = `${prefix}.variantOptions[${optionIndex}]`;

        if (
          !cleanText(option.group) ||
          cleanText(option.group).length >
            SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH
        ) {
          reasons.push(`${optionPrefix}.group:invalid_value`);
        }

        if (
          !cleanText(option.name) ||
          cleanText(option.name).length >
            SNAPSHOT_VARIANT_OPTION_TEXT_MAX_LENGTH
        ) {
          reasons.push(`${optionPrefix}.name:invalid_value`);
        }
      });
    }
  });

  return reasons;
}

function safeLineFromRequest(
  item: CheckoutCartRequestItem,
  input?: Partial<ValidatedCartLine>
): ValidatedCartLine {
  const priceCentavos = input?.priceCentavos ?? item.priceCentavos;
  const quantity = input?.quantity ?? item.quantity;
  const lineSubtotalCentavos = priceCentavos * quantity;

  return {
    availabilityLabel: input?.availabilityLabel ?? "Unavailable",
    availabilityStatus: input?.availabilityStatus ?? "UNAVAILABLE",
    lineSubtotalCentavos,
    lineSubtotalLabel: formatCatalogPrice(lineSubtotalCentavos),
    maxQuantity: input?.maxQuantity ?? 0,
    priceCentavos,
    priceLabel: input?.priceLabel ?? formatCatalogPrice(priceCentavos),
    productId: input?.productId ?? item.productId,
    productName:
      input?.productName ?? (cleanText(item.productName) || "Product"),
    productSlug: input?.productSlug ?? item.productSlug,
    quantity,
    recoveryStatus: input?.recoveryStatus ?? "BLOCKED",
    variantId: input?.variantId ?? item.variantId,
    variantLabel:
      input?.variantLabel ?? (cleanText(item.variantLabel) || "Option"),
    variantOptions: input?.variantOptions ?? item.variantOptions ?? [],
    ...(input?.imageAlt ? { imageAlt: input.imageAlt } : {}),
    ...(input?.imageSrc ? { imageSrc: input.imageSrc } : {}),
    ...(input?.reason ? { reason: input.reason } : {}),
    ...(input?.suggestedAction
      ? { suggestedAction: input.suggestedAction }
      : {}),
  };
}

function issue(input: {
  code: CheckoutCartIssueCode;
  item: CheckoutCartRequestItem;
  message: string;
}): CheckoutCartValidationIssue {
  return {
    code: input.code,
    message: input.message,
    productId: input.item.productId,
    variantId: input.item.variantId,
  };
}

function blockedLine(input: {
  code: CheckoutCartIssueCode;
  item: CheckoutCartRequestItem;
  message: string;
  serverLine?: CheckoutCartServerLine;
}): LineValidationState {
  const serverLine = input.serverLine;

  return {
    issues: [
      issue({
        code: input.code,
        item: input.item,
        message: input.message,
      }),
    ],
    line: safeLineFromRequest(input.item, {
      availabilityLabel: serverLine?.availabilityLabel ?? "Unavailable",
      availabilityStatus: "UNAVAILABLE",
      imageAlt: serverLine?.imageAlt,
      imageSrc: serverLine?.imageSrc,
      lineSubtotalCentavos: 0,
      lineSubtotalLabel: formatCatalogPrice(0),
      maxQuantity: 0,
      priceCentavos: serverLine?.priceCentavos ?? input.item.priceCentavos,
      priceLabel: formatCatalogPrice(
        serverLine?.priceCentavos ?? input.item.priceCentavos
      ),
      productId: serverLine?.productId ?? input.item.productId,
      productName:
        serverLine?.productName ??
        (cleanText(input.item.productName) || "Product"),
      productSlug: serverLine?.productSlug ?? input.item.productSlug,
      quantity: 0,
      reason: input.message,
      recoveryStatus: "BLOCKED",
      suggestedAction: "Remove this item or choose another option.",
      variantId: serverLine?.variantId ?? input.item.variantId,
      variantLabel:
        serverLine?.variantLabel ??
        (cleanText(input.item.variantLabel) || "Option"),
      variantOptions:
        serverLine?.variantOptions ?? input.item.variantOptions ?? [],
    }),
    status: "BLOCKED",
  };
}

function validateLine(
  item: CheckoutCartRequestItem,
  serverLine: CheckoutCartServerLine | undefined
): LineValidationState {
  if (!serverLine) {
    return blockedLine({
      code: "ITEM_INVALID",
      item,
      message: "This cart item could not be verified.",
    });
  }

  if (serverLine.productStatus !== "PUBLISHED") {
    return blockedLine({
      code: "PRODUCT_UNAVAILABLE",
      item,
      message: "This item is unavailable right now.",
    });
  }

  if (serverLine.variantProductId !== serverLine.productId) {
    return blockedLine({
      code: "PRODUCT_VARIANT_MISMATCH",
      item,
      message: "Selected option does not match this product.",
    });
  }

  if (serverLine.variantStatus !== "ACTIVE") {
    return blockedLine({
      code: "VARIANT_UNAVAILABLE",
      item,
      message: "This option is unavailable right now.",
    });
  }

  const maxQuantity = maxQuantityForServerLine(serverLine);

  if (maxQuantity < 1) {
    return blockedLine({
      code: "QUANTITY_UNAVAILABLE",
      item,
      message: "This option is unavailable right now.",
      serverLine,
    });
  }

  const issues: CheckoutCartValidationIssue[] = [];
  let availabilityStatus: CartAvailabilityStatus = "ACTIVE";
  let quantity = item.quantity;
  let reason: string | undefined;
  let recoveryStatus: CheckoutCartLineRecoveryStatus = "READY";
  let status: CheckoutCartValidationStatus = "VALID";
  let suggestedAction: string | undefined;

  if (serverLine.priceCentavos !== item.priceCentavos) {
    reason = "Review updated price before checkout.";
    recoveryStatus = "PRICE_CHANGED";
    status = "CHANGED";
    availabilityStatus = "STALE";
    suggestedAction = "Review updated price before checkout.";
    issues.push(
      issue({
        code: "PRICE_CHANGED",
        item,
        message: reason,
      })
    );
  }

  if (item.quantity > maxQuantity) {
    quantity = maxQuantity;
    reason = "Quantity changed to match current availability.";
    recoveryStatus = "QUANTITY_REDUCED";
    status = "CHANGED";
    availabilityStatus = "STALE";
    suggestedAction = "Review the updated quantity before checkout.";
    issues.push(
      issue({
        code: "QUANTITY_REDUCED",
        item,
        message: reason,
      })
    );
  }

  const lineSubtotalCentavos = serverLine.priceCentavos * quantity;

  return {
    issues,
    line: safeLineFromRequest(item, {
      availabilityLabel: serverLine.availabilityLabel,
      availabilityStatus,
      imageAlt: serverLine.imageAlt,
      imageSrc: serverLine.imageSrc,
      lineSubtotalCentavos,
      lineSubtotalLabel: formatCatalogPrice(lineSubtotalCentavos),
      maxQuantity,
      priceCentavos: serverLine.priceCentavos,
      priceLabel: formatCatalogPrice(serverLine.priceCentavos),
      productId: serverLine.productId,
      productName: serverLine.productName,
      productSlug: serverLine.productSlug,
      quantity,
      recoveryStatus,
      suggestedAction,
      variantId: serverLine.variantId,
      variantLabel: serverLine.variantLabel,
      variantOptions: serverLine.variantOptions,
      ...(reason ? { reason } : {}),
    }),
    status,
  };
}

export function validateCheckoutCart(input: {
  items: CheckoutCartRequestItem[];
  serverLines: CheckoutCartServerLine[];
}): CheckoutCartValidationResult {
  const validationReasons = validateCheckoutCartRequestItems(input.items);

  if (validationReasons.length > 0) {
    return {
      error: {
        code: "VALIDATION_FAILED",
        reasons: validationReasons,
      },
      summary: null,
    };
  }

  const serverLineByKey = new Map(
    input.serverLines.map((line) => [
      lineKey(line.productId, line.variantId),
      line,
    ])
  );
  const lineStates = input.items.map((item) =>
    validateLine(
      item,
      serverLineByKey.get(lineKey(item.productId, item.variantId))
    )
  );
  const items = lineStates.map((state) => state.line);
  const issues = lineStates.flatMap((state) => state.issues);
  const subtotalCentavos = items.reduce(
    (total, item) => total + item.lineSubtotalCentavos,
    0
  );
  const status: CheckoutCartValidationStatus = lineStates.some(
    (state) => state.status === "BLOCKED"
  )
    ? "BLOCKED"
    : lineStates.some((state) => state.status === "CHANGED")
      ? "CHANGED"
      : "VALID";

  return {
    error: null,
    summary: {
      issues,
      items,
      lineItemCount: items.length,
      requiresCustomerAcceptance: status !== "VALID",
      status,
      subtotalCentavos,
      subtotalLabel: formatCatalogPrice(subtotalCentavos),
      totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    },
  };
}
