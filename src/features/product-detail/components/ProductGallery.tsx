import * as React from "react";
import type { PublicCatalogGalleryItem } from "@/domain/products/public-types";

type ProductGalleryProps = {
  gallery: PublicCatalogGalleryItem[];
  productName: string;
  selectedImageId: string | null;
  onSelectImage: (imageId: string) => void;
};

function aspectRatioValue(image: PublicCatalogGalleryItem | null): string {
  if (!image?.width || !image.height) {
    return "1 / 1";
  }

  return `${image.width} / ${image.height}`;
}

export function ProductGallery({
  gallery,
  productName,
  selectedImageId,
  onSelectImage,
}: ProductGalleryProps) {
  const frameImage = gallery.find((image) => image.isPrimary) ?? gallery[0] ?? null;
  const selectedImage =
    gallery.find((image) => image.id === selectedImageId) ??
    frameImage ??
    null;

  return (
    <section
      aria-labelledby="product-gallery-title"
      className="grid gap-grid-sm"
    >
      <div className="flex items-center justify-between gap-grid-xs">
        <h2 className="m-0 text-[clamp(1.4rem,4vw,2rem)]" id="product-gallery-title">
          Gallery
        </h2>
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          {gallery.length} image{gallery.length === 1 ? "" : "s"}
        </p>
      </div>

      <div
        className="grid overflow-hidden border border-brand-border-strong bg-brand-background"
        style={{ aspectRatio: aspectRatioValue(frameImage) }}
      >
        {selectedImage ? (
          <img
            alt={selectedImage.alt}
            className="h-full w-full object-cover"
            height={selectedImage.height ?? undefined}
            loading="eager"
            src={selectedImage.src}
            width={selectedImage.width ?? undefined}
          />
        ) : (
          <div className="grid aspect-square place-items-center p-grid-sm text-center font-system text-xs font-bold uppercase text-brand-muted">
            {productName} image coming soon
          </div>
        )}
      </div>

      {gallery.length > 1 ? (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-grid-xs p-0">
          {gallery.map((image) => {
            const isSelected = image.id === selectedImage?.id;

            return (
              <li key={image.id}>
                <button
                  aria-label={`View ${image.alt}`}
                  aria-pressed={isSelected}
                  className={`grid w-full overflow-hidden border bg-brand-background ${
                    isSelected
                      ? "border-brand-accent"
                      : "border-brand-border-strong"
                  }`}
                  onClick={() => onSelectImage(image.id)}
                  type="button"
                >
                  <span className="grid aspect-square">
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      height={image.height ?? undefined}
                      loading="lazy"
                      src={image.src}
                      width={image.width ?? undefined}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export default ProductGallery;
