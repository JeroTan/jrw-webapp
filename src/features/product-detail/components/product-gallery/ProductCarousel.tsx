import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import type { PublicCatalogGalleryItem } from "@/domain/products/public-types";

type ProductCarouselProps = {
  gallery: PublicCatalogGalleryItem[];
  onNextImage: () => void;
  onPreviousImage: () => void;
  onSelectImage: (imageId: string) => void;
  selectedImageId: string | null;
};

const thumbnailOutlineClass =
  "hover:border-2 hover:border-brand-accent focus-visible:border-2 focus-visible:border-offset-2 focus-visible:border-brand-accent";

export function ProductCarousel({
  gallery,
  onNextImage,
  onPreviousImage,
  onSelectImage,
  selectedImageId,
}: ProductCarouselProps) {
  if (gallery.length <= 1) {
    return null;
  }

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-grid-xs">
      <Button
        aria-label="Previous product image"
        onClick={onPreviousImage}
        square
        variant="secondary"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
      </Button>

      <ul
        aria-label="Product image thumbnails"
        className="m-0 grid list-none grid-flow-col grid-cols-5 overflow-x-auto p-0"
      >
        {gallery.map((image) => {
          const isSelected = image.id === selectedImageId;

          return (
            <li key={image.id}>
              <button
                aria-label={`View ${image.alt}`}
                aria-pressed={isSelected}
                className={`grid w-full overflow-hidden border bg-brand-background ${
                  isSelected
                    ? "border-brand-accent"
                    : "border-brand-border-strong"
                } ${thumbnailOutlineClass}`}
                onClick={() => onSelectImage(image.id)}
                type="button"
              >
                <span className="block aspect-square overflow-hidden">
                  <img
                    alt=""
                    className="size-full object-cover"
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

      <Button
        aria-label="Next product image"
        onClick={onNextImage}
        square
        variant="secondary"
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}

export default ProductCarousel;
