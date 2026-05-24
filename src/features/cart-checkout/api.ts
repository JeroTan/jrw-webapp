import type {
  PublicCatalogDetailResult,
  PublicCatalogDetailVariant,
} from "@/domain/products/public-types";
import type {
  CartItemSnapshot,
  CreateCartItemSnapshotInput,
} from "@/domain/checkout/cart";
import type { ApiResponse } from "@/lib/api/response";
import {
  markCartItemAvailabilityInStore,
  replaceCartItemInStore,
} from "./store";

export type CartRefreshResult =
  | { detail: PublicCatalogDetailResult; kind: "ok" }
  | { kind: "unavailable"; reason: string }
  | { kind: "stale"; reason: string };

type PublicCatalogDetailEnvelope = ApiResponse<PublicCatalogDetailResult>;

function variantImageAlt(
  detail: PublicCatalogDetailResult,
  variant: PublicCatalogDetailVariant
): string | undefined {
  if (variant.imageSrc) {
    return (
      detail.gallery.find((image) => image.src === variant.imageSrc)?.alt ??
      detail.product.primaryImage?.alt ??
      detail.product.name
    );
  }

  return detail.product.primaryImage?.alt ?? detail.product.name;
}

export function cartItemInputFromDetail(
  detail: PublicCatalogDetailResult,
  variant: PublicCatalogDetailVariant,
  quantity: number | string = 1
): CreateCartItemSnapshotInput {
  return {
    availabilityText: variant.availability.label,
    imageAlt: variantImageAlt(detail, variant),
    imageSrc: variant.imageSrc ?? detail.product.primaryImage?.src,
    priceCentavos: variant.priceCentavos,
    priceLabel: variant.priceLabel,
    productId: detail.product.id,
    productName: detail.product.name,
    productSlug: detail.product.slug,
    quantity,
    variantId: variant.id,
    variantLabel: variant.label,
    variantOptions: variant.optionValues,
    variantProductId: variant.productId,
  };
}

export async function fetchCartProductDetail(
  slug: string,
  fetcher: typeof fetch = fetch
): Promise<CartRefreshResult> {
  try {
    const response = await fetcher(
      `/api/storefront/catalog/products/${encodeURIComponent(slug)}`,
      {
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (response.status === 404) {
      return {
        kind: "unavailable",
        reason: "Product is no longer available.",
      };
    }

    if (!response.ok) {
      return {
        kind: "stale",
        reason: "Could not verify this item. Try refresh.",
      };
    }

    const body = (await response.json()) as PublicCatalogDetailEnvelope;

    if ("data" in body) {
      return { detail: body.data, kind: "ok" };
    }

    return {
      kind: "stale",
      reason: "Could not verify this item. Try refresh.",
    };
  } catch {
    return {
      kind: "stale",
      reason: "Could not verify this item. Try refresh.",
    };
  }
}

export function refreshCartItemWithDetail(
  item: CartItemSnapshot,
  detail: PublicCatalogDetailResult
): CartRefreshResult {
  if (detail.product.id !== item.productId) {
    return {
      kind: "unavailable",
      reason: "Product is no longer available.",
    };
  }

  const variant = detail.variants.find(
    (candidate) => candidate.id === item.variantId
  );

  if (!variant) {
    return {
      kind: "unavailable",
      reason: "Selected option is no longer available.",
    };
  }

  if (variant.disabled || !variant.availability.inStock) {
    return {
      kind: "unavailable",
      reason:
        variant.unavailableReason ?? "Selected option is unavailable right now.",
    };
  }

  replaceCartItemInStore(cartItemInputFromDetail(detail, variant, item.quantity));
  return { detail, kind: "ok" };
}

export async function refreshCartItem(
  item: CartItemSnapshot,
  fetcher: typeof fetch = fetch
): Promise<CartRefreshResult> {
  const result = await fetchCartProductDetail(item.productSlug, fetcher);

  if (result.kind === "ok") {
    const detailResult = refreshCartItemWithDetail(item, result.detail);

    if (detailResult.kind !== "ok") {
      markCartItemAvailabilityInStore(
        item.productId,
        item.variantId,
        detailResult.kind === "unavailable" ? "UNAVAILABLE" : "STALE",
        detailResult.reason
      );
    }

    return detailResult;
  }

  markCartItemAvailabilityInStore(
    item.productId,
    item.variantId,
    result.kind === "unavailable" ? "UNAVAILABLE" : "STALE",
    result.reason
  );

  return result;
}

export async function refreshCartItems(
  items: CartItemSnapshot[],
  fetcher: typeof fetch = fetch
) {
  for (const item of items) {
    await refreshCartItem(item, fetcher);
  }
}
