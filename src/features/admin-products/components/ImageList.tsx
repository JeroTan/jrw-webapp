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
      <section className="jrw-images__list" aria-label="Loading images">
        <Skeleton label="Loading product images" lines={5} />
      </section>
    );
  }

  if (sortedImages.length === 0) {
    return (
      <section className="jrw-images__list" aria-label="No images">
        <EmptyState
          message="No images are linked to this product yet."
          title="No product images"
        />
      </section>
    );
  }

  return (
    <section className="jrw-images__list" aria-label="Product images">
      <header className="jrw-images__list-header">
        <h3 className="jrw-images__list-title">Images</h3>
        <p className="jrw-field__description">
          Primary image and order controls update current catalog display.
        </p>
      </header>

      <div className="jrw-images__grid" role="grid" aria-label="Product image grid">
        {sortedImages.map((image, index) => {
          const previous = sortedImages[index - 1] ?? null;
          const next = sortedImages[index + 1] ?? null;
          const alt =
            image.name && image.name.trim().length > 0
              ? image.name
              : `${productName ?? "Product"} image ${index + 1}`;

          return (
            <article
              className="jrw-images__card"
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
              <figure className="jrw-images__figure">
                <img
                  alt={alt}
                  className="jrw-images__thumbnail"
                  loading="lazy"
                  src={image.url}
                />
              </figure>

              <div className="jrw-images__meta">
                <div className="jrw-images__meta-header">
                  <strong>{image.name || `Image ${index + 1}`}</strong>
                  {image.isPrimary ? <Badge tone="info">Primary image</Badge> : null}
                </div>
                <p className="jrw-images__meta-copy">Order #{image.sortOrder}</p>
              </div>

              <div className="jrw-images__actions">
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
