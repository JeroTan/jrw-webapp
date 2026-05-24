import * as React from "react";
import { Button } from "@/components/ui";
import { StatusBadge } from "@/components/feedback";
import {
  cartItemKey,
  type CartItemSnapshot,
} from "@/domain/checkout/cart";
import { refreshCartItem } from "../api";
import {
  removeCartItemFromStore,
  updateCartItemQuantityInStore,
} from "../store";

type CartLineItemsProps = {
  items: CartItemSnapshot[];
};

const imageFallbackClass =
  "grid size-[84px] place-items-center border border-brand-border-strong bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--color-brand-border)_56%,transparent)_0_1px,transparent_1px_8px)] font-identity text-xl font-bold uppercase text-brand-muted";

function productInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CartEmptyState() {
  return (
    <section className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        Cart empty
      </p>
      <h2 className="m-0 font-identity text-3xl font-bold">
        Start with a product.
      </h2>
      <p className="m-0 max-w-[56ch] text-sm text-brand-muted">
        Add an available option from product detail. Cart saves in this browser.
      </p>
      <a
        className="inline-flex min-h-control-md w-fit items-center justify-center border border-brand-border-strong px-grid-sm font-system text-xs font-bold uppercase no-underline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        href="/products"
      >
        Browse products
      </a>
    </section>
  );
}

function CartLineItem({ item }: { item: CartItemSnapshot }) {
  const [draftQuantity, setDraftQuantity] = React.useState(String(item.quantity));
  const [status, setStatus] = React.useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const key = cartItemKey(item);
  const errorId = `${key.replace(/[^a-zA-Z0-9_-]/g, "-")}-quantity-error`;
  const isBlocked = item.availabilityStatus !== "ACTIVE";

  React.useEffect(() => {
    setDraftQuantity(String(item.quantity));
  }, [item.quantity]);

  function applyQuantity(nextQuantity: number | string) {
    setStatus("pending");
    const result = updateCartItemQuantityInStore(
      item.productId,
      item.variantId,
      nextQuantity
    );

    if (result.error) {
      setError(result.error.message);
      setStatus("idle");
      setDraftQuantity(String(item.quantity));
      return;
    }

    setError(null);
    setDraftQuantity(String(nextQuantity));
    setStatus("success");
    void refreshCartItem(item);
    window.setTimeout(() => {
      setStatus("idle");
    }, 1200);
  }

  return (
    <article
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm sm:grid-cols-[84px_minmax(0,1fr)]"
      role="listitem"
    >
      <a
        className="block w-fit hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        href={`/products/${encodeURIComponent(item.productSlug)}`}
      >
        {item.imageSrc ? (
          <img
            alt={item.imageAlt ?? item.productName}
            className="size-[84px] border border-brand-border-strong object-cover"
            height="84"
            src={item.imageSrc}
            width="84"
          />
        ) : (
          <span
            aria-label={`${item.productName} image coming soon`}
            className={imageFallbackClass}
            role="img"
          >
            {productInitials(item.productName)}
          </span>
        )}
      </a>

      <div className="grid min-w-0 gap-grid-xs">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-start justify-between gap-grid-xs">
            <div className="min-w-0">
              <h3 className="m-0 text-base font-bold [overflow-wrap:anywhere]">
                <a
                  className="no-underline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                  href={`/products/${encodeURIComponent(item.productSlug)}`}
                >
                  {item.productName}
                </a>
              </h3>
              <p className="m-0 text-sm text-brand-muted">{item.variantLabel}</p>
            </div>
            <p className="m-0 font-system text-sm font-bold">
              {item.priceLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {item.variantOptions.map((option) => (
              <span
                className="border border-brand-border px-2 py-1 font-system text-[0.6875rem] font-bold uppercase text-brand-muted"
                key={`${option.group}:${option.name}`}
              >
                {option.group}: {option.name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-grid-xs">
          <div
            aria-label={`Quantity for ${item.productName} ${item.variantLabel}`}
            className="flex flex-wrap items-end gap-1"
            role="group"
          >
            <Button
              aria-label="Decrease quantity"
              disabled={item.quantity <= 1}
              onClick={() => applyQuantity(item.quantity - 1)}
              size="sm"
            >
              -
            </Button>
            <label className="grid gap-1">
              <span className="font-system text-[0.6875rem] font-bold uppercase text-brand-muted">
                Qty
              </span>
              <input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? "true" : undefined}
                className="min-h-control-md w-[76px] border border-brand-border-strong bg-brand-surface px-grid-xs text-center font-system font-bold text-brand-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                inputMode="numeric"
                onChange={(event) => setDraftQuantity(event.currentTarget.value)}
                value={draftQuantity}
              />
            </label>
            <Button
              aria-label="Increase quantity"
              onClick={() => applyQuantity(item.quantity + 1)}
              size="sm"
            >
              +
            </Button>
            <Button onClick={() => applyQuantity(draftQuantity)} size="sm">
              Update
            </Button>
          </div>

          <Button
            onClick={() => removeCartItemFromStore(item.productId, item.variantId)}
            size="sm"
            variant="ghost"
          >
            Remove
          </Button>
        </div>

        <div className="min-h-control-md" aria-live="polite">
          {error ? (
            <p className="m-0 text-sm font-bold text-brand-danger" id={errorId}>
              {error}
            </p>
          ) : status === "pending" ? (
            <p className="m-0 text-sm text-brand-muted">Updating quantity...</p>
          ) : status === "success" ? (
            <p className="m-0 text-sm font-bold text-brand-success">
              Cart updated.
            </p>
          ) : isBlocked ? (
            <p className="m-0 text-sm font-bold text-brand-danger">
              {item.staleReason ?? item.availabilityText}
            </p>
          ) : (
            <p className="m-0 text-sm text-brand-muted">
              Line subtotal: PHP {((item.priceCentavos * item.quantity) / 100).toFixed(2)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-grid-xs">
          <StatusBadge
            label={isBlocked ? item.availabilityText : "Verified display item"}
            tone={isBlocked ? "error" : "success"}
          />
          {item.availabilityStatus === "STALE" ? (
            <span className="text-xs font-bold uppercase text-brand-muted">
              Refresh needed
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CartLineItems({ items }: CartLineItemsProps) {
  if (items.length === 0) {
    return <CartEmptyState />;
  }

  return (
    <div className="grid gap-grid-sm" role="list">
      {items.map((item) => (
        <CartLineItem item={item} key={cartItemKey(item)} />
      ))}
    </div>
  );
}

