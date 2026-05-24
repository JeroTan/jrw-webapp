import * as React from "react";
import { Skeleton } from "@/components/feedback";

type ProductCatalogSkeletonProps = {
  cardCount?: number;
};

export function ProductCatalogSkeleton({
  cardCount = 8,
}: ProductCatalogSkeletonProps) {
  return (
    <section aria-label="Loading catalog" className="grid gap-grid-sm">
      <div className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
        <Skeleton label="Loading catalog heading" lines={3} />
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-grid-sm p-0 xs:grid-cols-2 md:grid-cols-4 lg:grid-cols-12">
        {Array.from({ length: cardCount }).map((_, index) => (
          <li className="md:col-span-2 lg:col-span-4 xl:col-span-3" key={index}>
            <div className="grid h-full gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
              <Skeleton
                className="aspect-square"
                label={`Loading product card ${index + 1}`}
                lines={1}
              />
              <Skeleton lines={3} />
              <Skeleton lines={2} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ProductCatalogSkeleton;
