import * as React from "react";
import { StatusBadge } from "@/components/feedback";
import type { PublicCatalogDetailVariant } from "@/domain/products/public-types";
import type { StorefrontProductDetailResult } from "../types";
import { ProductGallery } from "./ProductGallery";
import { ProductVariantSelector } from "./ProductVariantSelector";

type ProductDetailPageProps = {
  detail: StorefrontProductDetailResult;
};

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
  if (currentImageId && detail.gallery.some((image) => image.id === currentImageId)) {
    return currentImageId;
  }

  if (selectedVariant?.imageSrc) {
    const image = detail.gallery.find((item) => item.src === selectedVariant.imageSrc);

    if (image) {
      return image.id;
    }
  }

  return detail.product.primaryImage?.id ?? detail.gallery[0]?.id ?? null;
}

export function ProductDetailPage({ detail }: ProductDetailPageProps) {
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(
    detail.selectedVariantId
  );
  const initialVariant = selectedVariantFromDetail(detail, detail.selectedVariantId);
  const [selectedImageId, setSelectedImageId] = React.useState<string | null>(
    selectedImageIdFromDetail(detail, initialVariant, null)
  );
  const selectedVariant = selectedVariantFromDetail(detail, selectedVariantId);
  const selectedImage = selectedImageIdFromDetail(
    detail,
    selectedVariant,
    selectedImageId
  );
  const availability = selectedVariant?.availability ?? detail.product.availability;
  const priceLabel = selectedVariant?.priceLabel ?? detail.product.priceLabel;
  const actionLabel = selectedVariant?.disabled ? "Unavailable" : detail.action.label;
  const actionReason = selectedVariant?.disabled
    ? selectedVariant.unavailableReason ?? detail.action.reason
    : detail.action.reason;

  return (
    <section
      aria-labelledby="product-detail-title"
      className="grid gap-grid-md"
    >
      <header className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          JRW. Product detail
        </p>
        <h1
          className="m-0 max-w-[16ch] font-identity text-[clamp(2.2rem,8vw,4.5rem)] [overflow-wrap:anywhere]"
          id="product-detail-title"
        >
          {detail.product.name}
        </h1>
        <div className="flex flex-wrap items-center gap-grid-xs">
          <StatusBadge label={availability.label} tone={availability.tone} />
          {detail.product.brandName ? (
            <span className="font-system text-xs font-bold uppercase text-brand-muted">
              {detail.product.brandName}
            </span>
          ) : null}
          {detail.product.categories.map((category) => (
            <a
              className="inline-flex min-h-control-md items-center border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase text-brand-muted no-underline hover:border-brand-accent focus-visible:border-brand-accent"
              href={category.href}
              key={category.id}
            >
              {category.name}
            </a>
          ))}
        </div>
        <p className="m-0 max-w-[70ch] text-[0.9375rem] text-brand-muted">
          {detail.product.summary?.trim() || detail.product.description}
        </p>
      </header>

      <div className="grid gap-grid-sm lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <ProductGallery
          gallery={detail.gallery}
          onSelectImage={setSelectedImageId}
          productName={detail.product.name}
          selectedImageId={selectedImage}
        />

        <div className="grid gap-grid-sm self-start">
          <section className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
            <div className="grid gap-[0.2rem]">
              <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
                Selected price
              </p>
              <p className="m-0 font-identity text-[clamp(2rem,5vw,3rem)] font-bold">
                {priceLabel}
              </p>
            </div>

            <div className="grid gap-grid-xs border-t border-brand-border-strong pt-grid-sm">
              <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
                Availability
              </p>
              <div className="flex flex-wrap items-center gap-grid-xs">
                <StatusBadge label={availability.label} tone={availability.tone} />
                {selectedVariant ? (
                  <span className="font-system text-xs font-bold uppercase text-brand-muted">
                    {selectedVariant.label}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-grid-xs border-t border-brand-border-strong pt-grid-sm">
              <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
                Product details
              </p>
              <p className="m-0 text-sm text-brand-content">
                {detail.product.description}
              </p>
            </div>
          </section>

          <ProductVariantSelector
            name="product-detail-variant"
            onSelectVariant={(variantId) => {
              const nextVariant = selectedVariantFromDetail(detail, variantId);

              setSelectedVariantId(variantId);
              setSelectedImageId(
                selectedImageIdFromDetail(detail, nextVariant, null)
              );
            }}
            selectedVariantId={selectedVariant?.id ?? null}
            variants={detail.variants}
          />

          <section className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
            <div className="grid gap-[0.2rem]">
              <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
                Cart action
              </p>
              <button
                className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong bg-brand-background px-grid-sm font-system text-xs font-bold uppercase text-brand-muted disabled:cursor-not-allowed"
                disabled
                type="button"
              >
                {actionLabel}
              </button>
            </div>

            {actionReason ? (
              <p className="m-0 text-sm text-brand-muted">{actionReason}</p>
            ) : null}

            <div className="flex flex-wrap gap-grid-xs">
              {detail.recoveryLinks.map((link) => (
                <a
                  className="inline-flex min-h-control-md items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:border-brand-accent focus-visible:border-brand-accent"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

export default ProductDetailPage;
