import * as React from "react";
import { useMemo, useRef, useState } from "react";
import { Badge, EmptyState, Skeleton } from "@/components/feedback";
import { Button, ConfirmDialog } from "@/components/ui";
import type { ProductPhotoRecord } from "../types";

export type ImageListProps = {
  busy?: boolean;
  images: ProductPhotoRecord[];
  initialRemoveTargetId?: string | null;
  loading?: boolean;
  onRemove: (photoId: string) => Promise<void> | void;
  onReorder: (photoId: string, sortOrder: number) => Promise<void> | void;
  onSetPrimary: (photoId: string) => Promise<void> | void;
  productName?: string;
};

function sortImages(images: ProductPhotoRecord[]): ProductPhotoRecord[] {
  return [...images].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    if (left.isPrimary !== right.isPrimary) {
      return left.isPrimary ? -1 : 1;
    }

    return left.id.localeCompare(right.id);
  });
}

export function ImageList({
  busy = false,
  images,
  initialRemoveTargetId = null,
  loading = false,
  onRemove,
  onReorder,
  onSetPrimary,
  productName,
}: ImageListProps) {
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(
    initialRemoveTargetId
  );
  const cardRefs = useRef<Array<HTMLElement | null>>([]);
  const sortedImages = useMemo(() => sortImages(images), [images]);

  if (loading) {
    return (
      <section className="grid gap-grid-sm" aria-label="Loading images">
        <Skeleton label="Loading product images" lines={5} />
      </section>
    );
  }

  if (sortedImages.length === 0) {
    return (
      <section className="grid gap-grid-sm" aria-label="No images">
        <EmptyState
          message="No images are linked to this product yet."
          title="No product images"
        />
      </section>
    );
  }

  return (
    <section className="grid gap-grid-sm" aria-label="Product images">
      <header className="grid gap-0.5">
        <h3 className="m-0 text-base">Images</h3>
        <p className="font-system text-xs text-brand-muted">
          Primary image and order controls update current catalog display.
        </p>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-grid-sm" role="grid" aria-label="Product image grid">
        {sortedImages.map((image, index) => {
          const previous = sortedImages[index - 1] ?? null;
          const next = sortedImages[index + 1] ?? null;
          const alt =
            image.name && image.name.trim().length > 0
              ? image.name
              : `${productName ?? "Product"} image ${index + 1}`;

          return (
            <article
              className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-xs focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-brand-accent"
              key={image.id}
              onKeyDown={(event) => {
                if (
                  event.key !== "ArrowLeft" &&
                  event.key !== "ArrowRight" &&
                  event.key !== "ArrowUp" &&
                  event.key !== "ArrowDown"
                ) {
                  return;
                }

                event.preventDefault();
                const targetIndex =
                  event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? Math.min(index + 1, sortedImages.length - 1)
                    : Math.max(index - 1, 0);
                cardRefs.current[targetIndex]?.focus();
              }}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              role="gridcell"
              tabIndex={0}
            >
              <figure className="m-0 aspect-square overflow-hidden border border-brand-border">
                <img
                  alt={alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  src={image.url}
                />
              </figure>

              <div className="grid gap-0.5">
                <div className="flex flex-wrap items-center gap-grid-xs">
                  <strong>{image.name || `Image ${index + 1}`}</strong>
                  {image.isPrimary ? <Badge tone="info">Primary image</Badge> : null}
                </div>
                <p className="m-0 text-xs text-brand-muted">Order #{image.sortOrder}</p>
              </div>

              <div className="flex flex-wrap gap-grid-xs">
                <Button
                  disabled={busy || image.isPrimary}
                  onClick={async () => {
                    await onSetPrimary(image.id);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Set primary
                </Button>
                <Button
                  disabled={busy || !previous}
                  onClick={async () => {
                    if (!previous) {
                      return;
                    }

                    await onReorder(image.id, previous.sortOrder);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Move up
                </Button>
                <Button
                  disabled={busy || !next}
                  onClick={async () => {
                    if (!next) {
                      return;
                    }

                    await onReorder(image.id, next.sortOrder);
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Move down
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => setRemoveTargetId(image.id)}
                  size="sm"
                  variant="danger"
                >
                  Remove
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        confirmLabel="Remove image"
        message="This removes image from current product list while keeping historical references intact."
        onCancel={() => setRemoveTargetId(null)}
        onConfirm={async () => {
          if (!removeTargetId) {
            return;
          }

          await onRemove(removeTargetId);
          setRemoveTargetId(null);
        }}
        open={Boolean(removeTargetId)}
        title="Remove image"
        tone="danger"
      />
    </section>
  );
}
