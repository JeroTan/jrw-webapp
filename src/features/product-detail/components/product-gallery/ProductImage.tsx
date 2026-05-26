import * as React from "react";
import type { PublicCatalogGalleryItem } from "@/domain/products/public-types";

type ProductImageProps = {
  image: PublicCatalogGalleryItem | null;
  productName: string;
};

export function ProductImage({ image, productName }: ProductImageProps) {
  return (
    <div className="grid aspect-square overflow-hidden border border-brand-border-strong bg-brand-background">
      {image ? (
        <img
          alt={image.alt}
          className="h-full w-full object-contain"
          height={image.height ?? undefined}
          loading="eager"
          src={image.src}
          width={image.width ?? undefined}
        />
      ) : (
        <div className="grid place-items-center p-grid-sm text-center font-system text-xs font-bold uppercase text-brand-muted">
          {productName} image coming soon
        </div>
      )}
    </div>
  );
}

export default ProductImage;
