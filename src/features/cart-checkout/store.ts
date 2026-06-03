import * as React from "react";
import {
  addCartItem,
  cartHasBlockingIssues,
  cartLineItemCount,
  cartStaleItemCount,
  cartSubtotalCentavos,
  cartSubtotalLabel,
  cartTotalQuantity,
  clearCartState,
  createEmptyCartState,
  markCartItemAvailability,
  removeCartItem,
  replaceCartItemSnapshot,
  updateCartItemQuantity,
  validateCartQuantity,
  type CartAvailabilityStatus,
  type CartItemSnapshot,
  type CartMutationResult,
  type CartState,
  type CreateCartItemSnapshotInput,
} from "@/domain/checkout/cart";
import { formatCatalogPrice } from "@/domain/products/price-format";

export const CART_STORAGE_KEY = "jrw.cart.v1";

type CartStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;
type CartSubscriber = () => void;

const serverCartSnapshot = createEmptyCartState("server");
const subscribers = new Set<CartSubscriber>();

let currentState: CartState = createEmptyCartState();
let hydrated = false;
let storageListenerAttached = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getBrowserStorage(): CartStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function safeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function safeAvailabilityStatus(value: unknown): CartAvailabilityStatus {
  return value === "STALE" || value === "UNAVAILABLE" ? value : "ACTIVE";
}

function parseCartItem(value: unknown): CartItemSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const productId = safeString(value.productId);
  const productName = safeString(value.productName);
  const productSlug = safeString(value.productSlug);
  const variantId = safeString(value.variantId);
  const variantLabel = safeString(value.variantLabel);
  const quantity = validateCartQuantity(value.quantity);
  const priceCentavos = value.priceCentavos;

  if (
    !productId ||
    !productName ||
    !productSlug ||
    !variantId ||
    !variantLabel ||
    quantity.error ||
    typeof priceCentavos !== "number" ||
    !Number.isInteger(priceCentavos) ||
    priceCentavos < 0
  ) {
    return null;
  }

  const variantOptions = Array.isArray(value.variantOptions)
    ? value.variantOptions
        .filter(isRecord)
        .map((option) => ({
          group: safeString(option.group) ?? "",
          name: safeString(option.name) ?? "",
        }))
        .filter((option) => option.group.length > 0 && option.name.length > 0)
    : [];
  const availabilityStatus = safeAvailabilityStatus(value.availabilityStatus);
  const staleReason = safeOptionalString(value.staleReason);

  return {
    availabilityStatus,
    availabilityText:
      safeString(value.availabilityText) ??
      (availabilityStatus === "ACTIVE" ? "Available" : "Needs review"),
    ...(safeOptionalString(value.imageAlt)
      ? { imageAlt: safeOptionalString(value.imageAlt) }
      : {}),
    ...(safeOptionalString(value.imageSrc)
      ? { imageSrc: safeOptionalString(value.imageSrc) }
      : {}),
    priceCentavos,
    priceLabel: safeString(value.priceLabel) ?? formatCatalogPrice(priceCentavos),
    productId,
    productName,
    productSlug,
    quantity: quantity.quantity,
    ...(staleReason ? { staleReason } : {}),
    updatedAt: safeString(value.updatedAt) ?? new Date().toISOString(),
    variantId,
    variantLabel,
    variantOptions,
  };
}

export function parseCartState(value: string | null): CartState {
  if (!value) {
    return createEmptyCartState();
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!isRecord(parsed) || !Array.isArray(parsed.items)) {
      return createEmptyCartState();
    }

    return {
      items: parsed.items
        .map((item) => parseCartItem(item))
        .filter((item): item is CartItemSnapshot => item !== null),
      updatedAt: safeString(parsed.updatedAt) ?? new Date().toISOString(),
    };
  } catch {
    return createEmptyCartState();
  }
}

export function readCartStateFromStorage(
  storage: CartStorage | null = getBrowserStorage()
): CartState {
  try {
    return parseCartState(storage?.getItem(CART_STORAGE_KEY) ?? null);
  } catch {
    return createEmptyCartState();
  }
}

export function writeCartStateToStorage(
  state: CartState,
  storage: CartStorage | null = getBrowserStorage()
) {
  try {
    if (state.items.length === 0) {
      storage?.removeItem(CART_STORAGE_KEY);
      return;
    }

    storage?.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Browser cart persistence is convenience state only.
  }
}

function notifyCartSubscribers() {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== CART_STORAGE_KEY) {
    return;
  }

  currentState = parseCartState(event.newValue);
  notifyCartSubscribers();
}

function ensureStorageListener() {
  if (
    storageListenerAttached ||
    typeof window === "undefined" ||
    typeof window.addEventListener !== "function"
  ) {
    return;
  }

  window.addEventListener("storage", handleStorageEvent);
  storageListenerAttached = true;
}

function ensureCartHydrated() {
  if (hydrated) {
    ensureStorageListener();
    return;
  }

  currentState = readCartStateFromStorage();
  hydrated = true;
  ensureStorageListener();
}

function commitCartState(nextState: CartState) {
  currentState = nextState;
  writeCartStateToStorage(currentState);
  notifyCartSubscribers();
}

export function subscribeCartStore(subscriber: CartSubscriber) {
  ensureCartHydrated();
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
}

export function getCartSnapshot(): CartState {
  ensureCartHydrated();
  return currentState;
}

export function getServerCartSnapshot(): CartState {
  return serverCartSnapshot;
}

export function useCartStore(): CartState {
  return React.useSyncExternalStore(
    subscribeCartStore,
    getCartSnapshot,
    getServerCartSnapshot
  );
}

export function addCartItemToStore(
  input: CreateCartItemSnapshotInput
): CartMutationResult {
  ensureCartHydrated();
  const result = addCartItem(currentState, input);

  if (!result.error) {
    commitCartState(result.state);
  }

  return result;
}

export function updateCartItemQuantityInStore(
  productId: string,
  variantId: string,
  quantity: number | string | unknown
): CartMutationResult {
  ensureCartHydrated();
  const result = updateCartItemQuantity(currentState, productId, variantId, quantity);

  if (!result.error) {
    commitCartState(result.state);
  }

  return result;
}

export function removeCartItemFromStore(productId: string, variantId: string) {
  ensureCartHydrated();
  commitCartState(removeCartItem(currentState, productId, variantId));
}

export function clearCartStore() {
  ensureCartHydrated();
  commitCartState(clearCartState(currentState));
}

export function replaceCartItemInStore(
  input: CreateCartItemSnapshotInput
): CartMutationResult {
  ensureCartHydrated();
  const result = replaceCartItemSnapshot(currentState, input);

  if (!result.error) {
    commitCartState(result.state);
  }

  return result;
}

export function markCartItemAvailabilityInStore(
  productId: string,
  variantId: string,
  availabilityStatus: CartAvailabilityStatus,
  reason: string
) {
  ensureCartHydrated();
  commitCartState(
    markCartItemAvailability(
      currentState,
      productId,
      variantId,
      availabilityStatus,
      reason
    )
  );
}

export function getCartSummary(state: CartState) {
  return {
    hasBlockingIssues: cartHasBlockingIssues(state),
    lineItemCount: cartLineItemCount(state),
    staleItemCount: cartStaleItemCount(state),
    subtotalCentavos: cartSubtotalCentavos(state),
    subtotalLabel: cartSubtotalLabel(state),
    totalQuantity: cartTotalQuantity(state),
  };
}

export function useCartSummary() {
  return getCartSummary(useCartStore());
}

export function resetCartStoreForTest(state = createEmptyCartState("test")) {
  currentState = state;
  hydrated = false;
  storageListenerAttached = false;
  subscribers.clear();
}

