import * as React from "react";
import { StatusBadge } from "@/components/feedback";
import type {
  PublicCatalogAvailability,
  PublicCatalogDetailVariant,
} from "@/domain/products/public-types";
import { cartItemInputFromDetail } from "@/features/cart-checkout/api";
import {
  addCartItemToStore,
  useCartStore,
} from "@/features/cart-checkout/store";
import type { StorefrontProductDetailResult } from "../../types";
import {
  selectionFromVariant,
  type VariantSelection,
} from "../../lib/variant-options";
import { ProductActions } from "../product-actions/ProductActions";
import { ProductQuantityControl } from "../product-quantity-control/ProductQuantityControl";
import { VariantSelector } from "../product-variant-selector/VariantSelector";

type ProductDetailsPanelProps = {
  detail: StorefrontProductDetailResult;
  onSelectedImageChange: (imageId: string | null) => void;
};

const unavailableSelectionAvailability = {
  inStock: false,
  label: "Unavailable",
  tone: "error",
} as const satisfies PublicCatalogAvailability;

function defaultVariantFromDetail(
  detail: StorefrontProductDetailResult
): PublicCatalogDetailVariant | null {
  return (
    detail.variants.find(
      (variant) => variant.id === detail.selectedVariantId
    ) ??
    detail.variants.find((variant) => variant.selected) ??
    detail.variants[0] ??
    null
  );
}

function variantFromDetail(
  detail: StorefrontProductDetailResult,
  variantId: string | null
): PublicCatalogDetailVariant | null {
  if (!variantId) {
    return null;
  }

  return detail.variants.find((variant) => variant.id === variantId) ?? null;
}

function selectedImageIdFromDetail(
  detail: StorefrontProductDetailResult,
  selectedVariant: PublicCatalogDetailVariant | null,
  currentImageId: string | null
): string | null {
  if (
    currentImageId &&
    detail.gallery.some((image) => image.id === currentImageId)
  ) {
    return currentImageId;
  }

  if (selectedVariant?.imageSrc) {
    const image = detail.gallery.find(
      (item) => item.src === selectedVariant.imageSrc
    );

    if (image) {
      return image.id;
    }
  }

  return detail.product.primaryImage?.id ?? detail.gallery[0]?.id ?? null;
}

export function initialSelectedImageIdFromDetail(
  detail: StorefrontProductDetailResult
): string | null {
  return selectedImageIdFromDetail(
    detail,
    defaultVariantFromDetail(detail),
    null
  );
}

function maxQuantityFromVariant(
  selectedVariant: PublicCatalogDetailVariant | null
): number {
  return Math.max(0, Math.trunc(selectedVariant?.maxQuantity ?? 0));
}

function clampQuantity(quantity: number, maxQuantity: number): number {
  const max = Math.max(1, maxQuantity);
  const cleanQuantity = Number.isFinite(quantity) ? Math.trunc(quantity) : 1;

  return Math.min(Math.max(cleanQuantity, 1), max);
}

export function availabilityLabelForCartCapacity(
  label: string,
  maxQuantity: number,
  existingCartQuantity: number
): string {
  if (maxQuantity <= 0 || label === "Preorder") {
    return label;
  }

  if (existingCartQuantity > 0) {
    const remainingQuantity = Math.max(0, maxQuantity - existingCartQuantity);

    return `${label} (${remainingQuantity} left, ${existingCartQuantity} in cart)`;
  }

  return `${label} (${maxQuantity} available)`;
}

export function ProductDetailsPanel({
  detail,
  onSelectedImageChange,
}: ProductDetailsPanelProps) {
  const cart = useCartStore();
  const initialVariant = defaultVariantFromDetail(detail);
  const [selectedVariantId, setSelectedVariantId] = React.useState<
    string | null
  >(initialVariant?.id ?? null);
  const [selectedSelection, setSelectedSelection] =
    React.useState<VariantSelection>(() =>
      selectionFromVariant(initialVariant)
    );
  const [quantity, setQuantity] = React.useState(1);
  const [cartStatus, setCartStatus] = React.useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [cartMessage, setCartMessage] = React.useState<string | null>(null);
  const selectedVariant = variantFromDetail(detail, selectedVariantId);
  const availability =
    selectedVariant?.availability ?? unavailableSelectionAvailability;
  const maxQuantity = maxQuantityFromVariant(selectedVariant);
  const existingCartQuantity = selectedVariant
    ? (cart.items.find(
        (item) =>
          item.productId === detail.product.id &&
          item.variantId === selectedVariant.id
      )?.quantity ?? 0)
    : 0;
  const remainingQuantity = Math.max(0, maxQuantity - existingCartQuantity);
  const displayQuantity = clampQuantity(quantity, remainingQuantity);
  const priceLabel = selectedVariant?.priceLabel ?? detail.product.priceLabel;
  const canAddToCart = Boolean(
    selectedVariant && !selectedVariant.disabled && remainingQuantity > 0
  );
  const actionLabel =
    selectedVariant && !selectedVariant.disabled
      ? detail.action.label
      : "Unavailable";
  const actionReason = selectedVariant
    ? selectedVariant.disabled
      ? (selectedVariant.unavailableReason ?? detail.action.reason)
      : detail.action.reason
    : detail.variants.length === 0
      ? "Product options are unavailable right now."
      : "Selected option combination is unavailable right now.";
  const cartLimitReason =
    selectedVariant && !selectedVariant.disabled && remainingQuantity <= 0
      ? "Selected option is already at the cart limit."
      : null;
  const visibleActionReason = cartLimitReason ?? actionReason;
  const availabilityLabel = availabilityLabelForCartCapacity(
    availability.label,
    maxQuantity,
    existingCartQuantity
  );

  function handleSelectOptions(
    selection: VariantSelection,
    nextVariant: PublicCatalogDetailVariant | null
  ) {
    const nextMaxQuantity = maxQuantityFromVariant(nextVariant);

    setSelectedSelection(selection);
    setSelectedVariantId(nextVariant?.id ?? null);

    if (nextVariant) {
      onSelectedImageChange(
        selectedImageIdFromDetail(detail, nextVariant, null)
      );
      setQuantity((currentQuantity) =>
        clampQuantity(currentQuantity, nextMaxQuantity)
      );
    }

    setCartMessage(null);
    setCartStatus("idle");
  }

  function addSelectedItemToCart() {
    if (!selectedVariant || !canAddToCart) {
      return false;
    }

    setCartStatus("pending");
    const result = addCartItemToStore(
      cartItemInputFromDetail(detail, selectedVariant, displayQuantity)
    );

    if (result.error) {
      setCartStatus("error");
      setCartMessage(result.error.message);
      return false;
    }

    setCartStatus("success");
    setCartMessage("Added to cart.");
    window.setTimeout(() => {
      setCartStatus("idle");
    }, 1400);
    return true;
  }

  function handleBuy() {
    if (addSelectedItemToCart()) {
      window.location.href = "/cart";
    }
  }

  async function handleShare() {
    const shareUrl = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: detail.product.name,
        url: shareUrl,
      });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      setCartMessage("Product link copied.");
      return;
    }

    setCartMessage("Copy product link from address bar.");
  }

  return (
    <section
      className="grid content-start gap-y-5 "
      aria-label="Product details"
    >
      <section>
        <h1
          className="brand-title-base text-[clamp(2rem,6vw,4rem)]"
          id="product-detail-title"
        >
          {detail.product.name}
        </h1>

        <div className="mb-2 flex flex-wrap items-center gap-grid-xs">
          {detail.product.brandName ? (
            <>
              <span className="brand-title-secondary">
                {detail.product.brandName}
              </span>
              <span className="brand-title-secondary">/</span>
            </>
          ) : null}
          {detail.product.categories.map((category) => (
            <a
              className="brand-title-secondary inline-flex items-center hover:border-b"
              href={category.href}
              key={category.id}
            >
              {category.name}
            </a>
          ))}
        </div>
        {detail.product.summary ? (
          <p className="brand-paragraph-secondary">{detail.product.summary}</p>
        ) : null}
      </section>

      <div className="grid">
        <p className="brand-title-secondary">Price</p>
        <p className="brand-title-big text-brand-accent">{priceLabel}</p>
      </div>

      <VariantSelector
        onSelectOptions={handleSelectOptions}
        selectedSelection={selectedSelection}
        selectedVariantId={selectedVariantId}
        variants={detail.variants}
      />

      <div className="grid items-start gap-grid-sm pt-grid-xs sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid items-start">
          <p className="brand-title-secondary mb-1">Availability</p>
          <div className="flex flex-wrap items-center gap-grid-xs">
            <StatusBadge label={availabilityLabel} tone={availability.tone} />
          </div>
        </div>
        <ProductQuantityControl
          disabled={!canAddToCart}
          maxQuantity={remainingQuantity}
          onQuantityChange={setQuantity}
          quantity={displayQuantity}
        />
      </div>

      <ProductActions
        addToCartLabel={actionLabel}
        disabled={!canAddToCart}
        loading={cartStatus === "pending"}
        onAddToCart={addSelectedItemToCart}
        onBuy={handleBuy}
        onShare={() => {
          void handleShare();
        }}
      />

      <div className="min-h-control-md" aria-live="polite">
        {cartMessage ? (
          <p
            className={
              cartStatus === "error"
                ? "m-0 text-sm font-bold text-brand-danger"
                : "m-0 text-sm font-bold text-brand-success"
            }
          >
            {cartMessage}
          </p>
        ) : visibleActionReason ? (
          <p className="m-0 text-sm text-brand-muted">{visibleActionReason}</p>
        ) : null}
      </div>
    </section>
  );
}

export default ProductDetailsPanel;
