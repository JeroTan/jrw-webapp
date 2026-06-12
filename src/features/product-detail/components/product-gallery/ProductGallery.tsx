import * as React from "react";
import type { PublicCatalogGalleryItem } from "@/domain/products/public-types";
import { ProductCarousel } from "./ProductCarousel";
import { ProductImage } from "./ProductImage";

type ProductGalleryProps = {
  gallery: PublicCatalogGalleryItem[];
  productName: string;
  selectedImageId: string | null;
  onSelectImage: (imageId: string) => void;
};

export function ProductGallery({
  gallery,
  productName,
  selectedImageId,
  onSelectImage,
}: ProductGalleryProps) {
  const fallbackImage = gallery.find((image) => image.isPrimary) ?? gallery[0] ?? null;
  const selectedImage =
    gallery.find((image) => image.id === selectedImageId) ?? fallbackImage;
  const selectedIndex = selectedImage
    ? gallery.findIndex((image) => image.id === selectedImage.id)
    : -1;

  function selectByOffset(offset: number) {
    if (gallery.length <= 1 || selectedIndex < 0) {
      return;
    }

    const nextIndex = (selectedIndex + offset + gallery.length) % gallery.length;
    const nextImage = gallery[nextIndex];

    if (nextImage) {
      onSelectImage(nextImage.id);
    }
  }

  return (
    <section
      aria-label={`${productName} images`}
      className="grid content-start gap-grid-sm border border-brand-border bg-brand-background p-grid-sm"
      data-product-detail-module="product-gallery"
    >
      <ProductImage image={selectedImage} productName={productName} />
      <ProductCarousel
        gallery={gallery}
        onNextImage={() => selectByOffset(1)}
        onPreviousImage={() => selectByOffset(-1)}
        onSelectImage={onSelectImage}
        selectedImageId={selectedImage?.id ?? null}
      />
    </section>
  );
}

export default ProductGallery;
