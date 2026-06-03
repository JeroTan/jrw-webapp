import { formatCatalogPrice } from "@/domain/products/price-format";
import { SNAPSHOT_VARIANT_OPTION_MAX_ITEMS } from "@/domain/snapshots/schemas";

export const STOREFRONT_CART_LINE_QUANTITY_MAX = 99;

export type CartAvailabilityStatus = "ACTIVE" | "STALE" | "UNAVAILABLE";

export type CartVariantOption = {
  group: string;
  name: string;
};

export type CartItemSnapshot = {
  availabilityStatus: CartAvailabilityStatus;
  availabilityText: string;
  imageAlt?: string;
  imageSrc?: string;
  maxQuantity: number;
  priceCentavos: number;
  priceLabel: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity: number;
  staleReason?: string;
  updatedAt: string;
  variantId: string;
  variantLabel: string;
  variantOptions: CartVariantOption[];
};

export type CartState = {
  items: CartItemSnapshot[];
  updatedAt: string;
};

export type CreateCartItemSnapshotInput = {
  availabilityText: string;
  imageAlt?: string;
  imageSrc?: string;
  maxQuantity?: number;
  priceCentavos: number;
  priceLabel?: string;
  productId: string;
  productName: string;
  productSlug: string;
  quantity?: number | string;
  variantId: string;
  variantLabel: string;
  variantOptions: CartVariantOption[];
  variantProductId: string;
};

export type CartQuantityErrorCode =
  | "QUANTITY_NOT_NUMERIC"
  | "QUANTITY_BELOW_MIN"
  | "QUANTITY_ABOVE_MAX"
  | "QUANTITY_NOT_INTEGER";

export type CartQuantityError = {
  code: CartQuantityErrorCode;
  message: string;
};

export type CartValidationErrorCode =
  | CartQuantityErrorCode
  | "PRODUCT_VARIANT_MISMATCH"
  | "PRODUCT_REQUIRED"
  | "VARIANT_REQUIRED"
  | "PRICE_INVALID";

export type CartValidationError = {
  code: CartValidationErrorCode;
  message: string;
};

export type CartMutationResult = {
  error: CartValidationError | null;
  state: CartState;
};

export type CartItemBuildResult =
  | { error: CartValidationError; item: null }
  | { error: null; item: CartItemSnapshot };

const emptyCartTimestamp = "1970-01-01T00:00:00.000Z";

function timestamp(value?: string): string {
  return value ?? new Date().toISOString();
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function quantityError(code: CartQuantityErrorCode): CartQuantityError {
  switch (code) {
    case "QUANTITY_ABOVE_MAX":
      return {
        code,
        message: "Quantity exceeds the available limit.",
      };
    case "QUANTITY_BELOW_MIN":
      return { code, message: "Quantity must be at least 1." };
    case "QUANTITY_NOT_INTEGER":
      return { code, message: "Quantity must be a whole number." };
    case "QUANTITY_NOT_NUMERIC":
      return { code, message: "Enter a numeric quantity." };
  }
}

function validationError(
  code: CartValidationErrorCode,
  message: string
): CartValidationError {
  return { code, message };
}

export function normalizeCartLineQuantityMax(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return STOREFRONT_CART_LINE_QUANTITY_MAX;
  }

  return Math.min(
    Math.max(1, Math.trunc(value)),
    STOREFRONT_CART_LINE_QUANTITY_MAX
  );
}

export function clampCartQuantityToMax(
  value: number | string | unknown,
  maxQuantity: number
): number | null {
  const parsed =
    typeof value === "string" && value.trim().length > 0
      ? Number(value.trim())
      : value;

  if (
    typeof parsed !== "number" ||
    !Number.isFinite(parsed) ||
    !Number.isInteger(parsed) ||
    parsed < 1
  ) {
    return null;
  }

  return Math.min(parsed, maxQuantity);
}

export function createEmptyCartState(updatedAt = emptyCartTimestamp): CartState {
  return {
    items: [],
    updatedAt,
  };
}

export function cartLineKey(productId: string, variantId: string): string {
  return `${productId}::${variantId}`;
}

export function cartItemKey(item: Pick<CartItemSnapshot, "productId" | "variantId">) {
  return cartLineKey(item.productId, item.variantId);
}

export function validateCartQuantity(
  value: number | string | unknown,
  maxQuantity = STOREFRONT_CART_LINE_QUANTITY_MAX
): { error: CartQuantityError; quantity: null } | { error: null; quantity: number } {
  const max = normalizeCartLineQuantityMax(maxQuantity);
  const parsed =
    typeof value === "string" && value.trim().length > 0
      ? Number(value.trim())
      : value;

  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    return { error: quantityError("QUANTITY_NOT_NUMERIC"), quantity: null };
  }

  if (!Number.isInteger(parsed)) {
    return { error: quantityError("QUANTITY_NOT_INTEGER"), quantity: null };
  }

  if (parsed < 1) {
    return { error: quantityError("QUANTITY_BELOW_MIN"), quantity: null };
  }

  if (parsed > max) {
    return { error: quantityError("QUANTITY_ABOVE_MAX"), quantity: null };
  }

  return { error: null, quantity: parsed };
}

export function createCartItemSnapshot(
  input: CreateCartItemSnapshotInput,
  updatedAt = timestamp()
): CartItemBuildResult {
  const productId = cleanText(input.productId);
  const variantId = cleanText(input.variantId);

  if (!productId || !cleanText(input.productSlug) || !cleanText(input.productName)) {
    return {
      error: validationError("PRODUCT_REQUIRED", "Product data is incomplete."),
      item: null,
    };
  }

  if (!variantId || !cleanText(input.variantLabel)) {
    return {
      error: validationError("VARIANT_REQUIRED", "Choose an available option."),
      item: null,
    };
  }

  if (productId !== cleanText(input.variantProductId)) {
    return {
      error: validationError(
        "PRODUCT_VARIANT_MISMATCH",
        "Selected option does not match this product."
      ),
      item: null,
    };
  }

  if (
    typeof input.priceCentavos !== "number" ||
    !Number.isInteger(input.priceCentavos) ||
    input.priceCentavos < 0
  ) {
    return {
      error: validationError("PRICE_INVALID", "Selected option price is unavailable."),
      item: null,
    };
  }

  const maxQuantity = normalizeCartLineQuantityMax(input.maxQuantity);
  const quantity = validateCartQuantity(input.quantity ?? 1, maxQuantity);
  if (quantity.error) {
    return { error: quantity.error, item: null };
  }

  return {
    error: null,
    item: {
      availabilityStatus: "ACTIVE",
      availabilityText: cleanText(input.availabilityText) || "Available",
      ...(input.imageAlt?.trim() ? { imageAlt: cleanText(input.imageAlt) } : {}),
      ...(input.imageSrc?.trim() ? { imageSrc: input.imageSrc.trim() } : {}),
      maxQuantity,
      priceCentavos: input.priceCentavos,
      priceLabel: input.priceLabel?.trim() || formatCatalogPrice(input.priceCentavos),
      productId,
      productName: cleanText(input.productName),
      productSlug: cleanText(input.productSlug),
      quantity: quantity.quantity,
      updatedAt,
      variantId,
      variantLabel: cleanText(input.variantLabel),
      variantOptions: input.variantOptions
        .slice(0, SNAPSHOT_VARIANT_OPTION_MAX_ITEMS)
        .map((option) => ({
          group: cleanText(option.group),
          name: cleanText(option.name),
        }))
        .filter((option) => option.group.length > 0 && option.name.length > 0),
    },
  };
}

export function addCartItem(
  state: CartState,
  input: CreateCartItemSnapshotInput,
  updatedAt = timestamp()
): CartMutationResult {
  const nextItem = createCartItemSnapshot(input, updatedAt);

  if (nextItem.error) {
    return { error: nextItem.error, state };
  }

  const lineKey = cartItemKey(nextItem.item);
  const existing = state.items.find((item) => cartItemKey(item) === lineKey);

  if (!existing) {
    return {
      error: null,
      state: {
        items: [...state.items, nextItem.item],
        updatedAt,
      },
    };
  }

  const nextQuantity = existing.quantity + nextItem.item.quantity;
  const quantity = validateCartQuantity(nextQuantity, nextItem.item.maxQuantity);

  if (quantity.error) {
    return { error: quantity.error, state };
  }

  return {
    error: null,
    state: {
      items: state.items.map((item) =>
        cartItemKey(item) === lineKey
          ? {
              ...nextItem.item,
              quantity: quantity.quantity,
              updatedAt,
            }
          : item
      ),
      updatedAt,
    },
  };
}

export function updateCartItemQuantity(
  state: CartState,
  productId: string,
  variantId: string,
  quantityValue: number | string | unknown,
  updatedAt = timestamp()
): CartMutationResult {
  const lineKey = cartLineKey(productId, variantId);
  const currentItem = state.items.find((item) => cartItemKey(item) === lineKey);
  const quantity = validateCartQuantity(quantityValue, currentItem?.maxQuantity);

  if (quantity.error) {
    return { error: quantity.error, state };
  }

  return {
    error: null,
    state: {
      items: state.items.map((item) =>
        cartItemKey(item) === lineKey
          ? {
              ...item,
              quantity: quantity.quantity,
              updatedAt,
            }
          : item
      ),
      updatedAt,
    },
  };
}

export function removeCartItem(
  state: CartState,
  productId: string,
  variantId: string,
  updatedAt = timestamp()
): CartState {
  const lineKey = cartLineKey(productId, variantId);

  return {
    items: state.items.filter((item) => cartItemKey(item) !== lineKey),
    updatedAt,
  };
}

export function clearCartState(
  _state: CartState,
  updatedAt = timestamp()
): CartState {
  return createEmptyCartState(updatedAt);
}

export function replaceCartItemSnapshot(
  state: CartState,
  input: CreateCartItemSnapshotInput,
  updatedAt = timestamp()
): CartMutationResult {
  const current = state.items.find(
    (item) => item.productId === input.productId && item.variantId === input.variantId
  );
  const maxQuantity = normalizeCartLineQuantityMax(input.maxQuantity);
  const quantity = clampCartQuantityToMax(
    current?.quantity ?? input.quantity ?? 1,
    maxQuantity
  );
  const nextItem = createCartItemSnapshot(
    {
      ...input,
      maxQuantity,
      quantity: quantity ?? 1,
    },
    updatedAt
  );

  if (nextItem.error) {
    return { error: nextItem.error, state };
  }

  return {
    error: null,
    state: {
      items: state.items.map((item) =>
        cartItemKey(item) === cartItemKey(nextItem.item) ? nextItem.item : item
      ),
      updatedAt,
    },
  };
}

export function markCartItemAvailability(
  state: CartState,
  productId: string,
  variantId: string,
  availabilityStatus: CartAvailabilityStatus,
  reason: string,
  updatedAt = timestamp()
): CartState {
  const lineKey = cartLineKey(productId, variantId);

  return {
    items: state.items.map((item) =>
      cartItemKey(item) === lineKey
        ? {
            ...item,
            availabilityStatus,
            availabilityText: cleanText(reason) || item.availabilityText,
            staleReason:
              availabilityStatus === "ACTIVE" ? undefined : cleanText(reason),
            updatedAt,
          }
        : item
    ),
    updatedAt,
  };
}

export function cartTotalQuantity(state: CartState): number {
  return state.items.reduce((total, item) => total + item.quantity, 0);
}

export function cartLineItemCount(state: CartState): number {
  return state.items.length;
}

export function cartSubtotalCentavos(state: CartState): number {
  return state.items.reduce(
    (total, item) => total + item.priceCentavos * item.quantity,
    0
  );
}

export function cartStaleItemCount(state: CartState): number {
  return state.items.filter((item) => item.availabilityStatus !== "ACTIVE").length;
}

export function cartHasBlockingIssues(state: CartState): boolean {
  return cartStaleItemCount(state) > 0;
}

export function cartSubtotalLabel(state: CartState): string {
  return formatCatalogPrice(cartSubtotalCentavos(state));
}
