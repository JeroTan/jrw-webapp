import * as React from "react";
import { StatusBadge } from "@/components/feedback";
import type { PublicCatalogDetailVariant } from "@/domain/products/public-types";
import {
  addCartItemToStore,
  cartItemInputFromDetail,
} from "@/features/cart-checkout";
import type { StorefrontProductDetailResult } from "./types";
import { ProductActions } from "./components/product-actions/ProductActions";
import { ProductBrandSummary } from "./components/product-brand-summary/ProductBrandSummary";
import { ProductDescription } from "./components/product-description/ProductDescription";
import { ProductGallery } from "./components/product-gallery/ProductGallery";
import { ProductQuantityControl } from "./components/product-quantity-control/ProductQuantityControl";
import { ProductRecommendations } from "./components/product-recommendations/ProductRecommendations";
import { VariantSelector } from "./components/product-variant-selector/VariantSelector";

type ProductDetailPageProps = {
  detail: StorefrontProductDetailResult;
};

const linkOutlineClass =
  "hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent";

function selectedVariantFromDetail(
  detail: StorefrontProductDetailResult,
  variantId: string | null
): PublicCatalogDetailVariant | null {
  return (
    detail.variants.find((variant) => variant.id === variantId) ??
    detail.variants.find((variant) => variant.selected) ??
    detail.variants[0] ??
    null
  );
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

export function ProductDetailPage({ detail }: ProductDetailPageProps) {
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(
    detail.selectedVariantId
  );
  const initialVariant = selectedVariantFromDetail(detail, detail.selectedVariantId);
  const [selectedImageId, setSelectedImageId] = React.useState<string | null>(
    selectedImageIdFromDetail(detail, initialVariant, null)
  );
  const [quantity, setQuantity] = React.useState(1);
  const [cartStatus, setCartStatus] = React.useState<
    "idle" | "pending" | "success" | "error"
  >("idle");
  const [cartMessage, setCartMessage] = React.useState<string | null>(null);
  const selectedVariant = selectedVariantFromDetail(detail, selectedVariantId);
  const selectedImage = selectedImageIdFromDetail(
    detail,
    selectedVariant,
    selectedImageId
  );
  const availability = selectedVariant?.availability ?? detail.product.availability;
  const maxQuantity = maxQuantityFromVariant(selectedVariant);
  const displayQuantity = clampQuantity(quantity, maxQuantity);
  const priceLabel = selectedVariant?.priceLabel ?? detail.product.priceLabel;
  const actionLabel = selectedVariant?.disabled ? "Unavailable" : detail.action.label;
  const actionReason = selectedVariant?.disabled
    ? selectedVariant.unavailableReason ?? detail.action.reason
    : detail.action.reason;
  const canAddToCart = Boolean(
    selectedVariant && !selectedVariant.disabled && maxQuantity > 0
  );
  const availabilityLabel =
    maxQuantity > 0 ? `${availability.label} (${maxQuantity} available)` : availability.label;

  function handleSelectVariant(variantId: string) {
    const nextVariant = selectedVariantFromDetail(detail, variantId);
    const nextMaxQuantity = maxQuantityFromVariant(nextVariant);

    setSelectedVariantId(variantId);
    setSelectedImageId(selectedImageIdFromDetail(detail, nextVariant, null));
    setQuantity((currentQuantity) =>
      clampQuantity(currentQuantity, nextMaxQuantity)
    );
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

    await navigator.clipboard?.writeText(shareUrl);
    setCartMessage("Product link copied.");
  }

  return (
    <section
      aria-labelledby="product-detail-title"
      className="grid gap-grid-lg"
    >
      <section
        className="grid gap-grid-md border border-brand-border-strong bg-brand-background p-grid-sm md:p-grid-md"
        data-product-detail-module="product-details"
      >
        <div className="grid gap-grid-md lg:grid-cols-[minmax(0,40%)_minmax(0,60%)]">
          <ProductGallery
            gallery={detail.gallery}
            onSelectImage={setSelectedImageId}
            productName={detail.product.name}
            selectedImageId={selectedImage}
          />

          <section className="grid content-start gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
            <h1
              className="m-0 max-w-[18ch] font-identity text-[clamp(2rem,6vw,4rem)] [overflow-wrap:anywhere]"
              id="product-detail-title"
            >
              {detail.product.name}
            </h1>

            <div className="flex flex-wrap items-center gap-grid-xs">
              {detail.product.brandName ? (
                <span className="font-system text-xs font-bold uppercase text-brand-muted">
                  {detail.product.brandName}
                </span>
              ) : null}
              {detail.product.categories.map((category) => (
                <a
                  className={`inline-flex min-h-control-md items-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase text-brand-muted no-underline ${linkOutlineClass}`}
                  href={category.href}
                  key={category.id}
                >
                  {category.name}
                </a>
              ))}
            </div>

            {detail.product.summary ? (
              <p className="m-0 text-[0.9375rem] text-brand-muted">
                {detail.product.summary}
              </p>
            ) : null}

            <div className="grid gap-[0.2rem] border-t border-brand-border-strong pt-grid-sm">
              <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
                Selected price
              </p>
              <p className="m-0 font-identity text-[clamp(1.8rem,5vw,2.75rem)] font-bold">
                {priceLabel}
              </p>
            </div>

            <VariantSelector
              onSelectVariant={handleSelectVariant}
              selectedVariantId={selectedVariant?.id ?? null}
              variants={detail.variants}
            />

            <div className="grid gap-grid-sm border-t border-brand-border-strong pt-grid-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="grid gap-grid-xs">
                <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
                  Availability
                </p>
                <div className="flex flex-wrap items-center gap-grid-xs">
                  <StatusBadge label={availabilityLabel} tone={availability.tone} />
                  {selectedVariant ? (
                    <span className="font-system text-xs font-bold uppercase text-brand-muted">
                      {selectedVariant.label}
                    </span>
                  ) : null}
                </div>
              </div>
              <ProductQuantityControl
                disabled={!canAddToCart}
                maxQuantity={maxQuantity}
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
              ) : actionReason ? (
                <p className="m-0 text-sm text-brand-muted">{actionReason}</p>
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
