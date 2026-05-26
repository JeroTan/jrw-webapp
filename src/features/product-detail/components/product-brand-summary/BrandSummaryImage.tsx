import * as React from "react";
import type { PublicCatalogBrandSummary } from "@/domain/products/public-types";

type BrandSummaryImageProps = {
  brand: PublicCatalogBrandSummary;
};

function brandInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "BR"
  );
}

export function BrandSummaryImage({ brand }: BrandSummaryImageProps) {
  if (brand.imageSrc) {
    return (
      <div className="grid size-24 overflow-hidden border border-brand-border-strong bg-brand-background">
        <img
          alt={brand.imageAlt ?? brand.name}
          className="h-full w-full object-cover"
          loading="lazy"
          src={brand.imageSrc}
        />
      </div>
    );
  }

  return (
    <div
      aria-label={`${brand.name} brand image`}
      className="grid size-24 place-items-center border border-brand-border-strong bg-brand-background font-identity text-[2rem] font-black text-brand-content"
      role="img"
    >
      {brandInitials(brand.name)}
    </div>
  );
}

export default BrandSummaryImage;
