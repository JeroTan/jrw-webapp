import * as React from "react";
import { StatusBadge } from "@/components/feedback";
import type { PublicCatalogDetailVariant } from "@/domain/products/public-types";
import { cartItemInputFromDetail } from "@/features/cart-checkout/api";
import {
  addCartItemToStore,
  useCartStore,
} from "@/features/cart-checkout/store";
import type { StorefrontProductDetailResult } from "./types";
import { ProductActions } from "./components/product-actions/ProductActions";
import { ProductBrandSummary } from "./components/product-brand-summary/ProductBrandSummary";
import { ProductDescription } from "./components/product-description/ProductDescription";
import { ProductGallery } from "./components/product-gallery/ProductGallery";
import { ProductQuantityControl } from "./components/product-quantity-control/ProductQuantityControl";
import { ProductRecommendations } from "./components/product-recommendations/ProductRecommendations";
import { VariantSelector } from "./components/product-variant-selector/VariantSelector";
import {
  selectionFromVariant,
  type VariantSelection,
} from "./lib/variant-options";

type ProductDetailPageProps = {
  detail: StorefrontProductDetailResult;
};

const linkOutlineClass =
  "hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent";

const unavailableSelectionAvailability = {
  inStock: false,
  label: "Unavailable",
  tone: "error",
} as const;

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

export function ProductDetailPage({ detail }: ProductDetailPageProps) {
  const cart = useCartStore();
  const initialVariant = defaultVariantFromDetail(detail);
  const [selectedVariantId, setSelectedVariantId] = React.useState<
    string | null
  >(initialVariant?.id ?? null);
  const [selectedSelection, setSelectedSelection] =
    React.useState<VariantSelection>(() =>
      selectionFromVariant(initialVariant)
    );
  const [selectedImageId, setSelectedImageId] = React.useState<string | null>(
    selectedImageIdFromDetail(detail, initialVariant, null)
  );
  const [quantity, setQuantity] = React.useState(1);
  const [cartStatus, setCartStatus] = React.useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [cartMessage, setCartMessage] = React.useState<string | null>(null);
  const selectedVariant = variantFromDetail(detail, selectedVariantId);
  const effectiveSelectedImageId = selectedImageIdFromDetail(
    detail,
    selectedVariant,
    selectedImageId
  );
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
      setSelectedImageId(selectedImageIdFromDetail(detail, nextVariant, null));
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
      aria-labelledby="product-detail-title"
      className="grid gap-grid-lg"
    >
      <section
        className="grid gap-grid-md "
        data-product-detail-module="product-details"
      >
        <div className="grid gap-grid-md lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
          <ProductGallery
            gallery={detail.gallery}
            onSelectImage={setSelectedImageId}
            productName={detail.product.name}
            selectedImageId={effectiveSelectedImageId}
          />

          <section className="" aria-label="Product details">
            <section className="mb-5">
              <h1
                className="brand-title-base text-[clamp(2rem,6vw,4rem)]"
                id="product-detail-title"
              >
                {detail.product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-grid-xs mb-2">
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
                    className={`brand-title-secondary inline-flex items-center hover:border-b`}
                    href={category.href}
                    key={category.id}
                  >
                    {category.name}
                  </a>
                ))}
              </div>
              {detail.product.summary ? (
                <p className="brand-paragraph-secondary">
                  {detail.product.summary}
                </p>
              ) : null}
            </section>

            <div className="grid mb-5">
              <p className="brand-title-secondary">Price</p>
              <p className="brand-title-big text-brand-accent">{priceLabel}</p>
            </div>

            <VariantSelector
              onSelectOptions={handleSelectOptions}
              selectedSelection={selectedSelection}
              selectedVariantId={selectedVariant?.id ?? null}
              variants={detail.variants}
            />

            <div className="grid gap-grid-sm pt-grid-xs sm:grid-cols-[minmax(0,1fr)_auto] items-start mb-5">
              <div className="grid items-start">
                <p className="brand-title-secondary mb-1">Availability</p>
                <div className="flex flex-wrap items-center gap-grid-xs">
                  <StatusBadge
                    label={availabilityLabel}
                    tone={availability.tone}
                  />
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
                <p className="m-0 text-sm text-brand-muted">
                  {visibleActionReason}
                </p>
              ) : null}
            </div>
          </section>
        </div>

        <ProductDescription description={detail.product.description} />
      </section>

      <ProductBrandSummary brand={detail.brand} />
      <ProductRecommendations recommendations={detail.recommendations} />
      <section
        aria-hidden="true"
        data-placeholder="comments-review"
        data-product-detail-module="reviews-placeholder"
        hidden
      />
    </section>
  );
}

export default ProductDetailPage;
