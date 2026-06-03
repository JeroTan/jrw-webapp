import * as React from "react";
import { Button, ButtonLink, Input, Label } from "@/components/ui";
import { StatusBadge } from "@/components/feedback";
import {
  cartItemKey,
  type CartItemSnapshot,
} from "@/domain/checkout/cart";
import { formatCatalogPrice } from "@/domain/products/price-format";
import { Minus, Plus, X } from "lucide-react";
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
      <ButtonLink className="w-fit" href="/products" textSize="xs">
        Browse products
      </ButtonLink>
    </section>
  );
}

function CartLineItem({ item }: { item: CartItemSnapshot }) {
  const [draftQuantity, setDraftQuantity] = React.useState(String(item.quantity));
  const [status, setStatus] = React.useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = React.useState<string | null>(null);
  const key = cartItemKey(item);
  const errorId = `${key.replace(/[^a-zA-Z0-9_-]/g, "-")}-quantity-error`;
  const quantityInputId = `${errorId}-quantity`;
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

  const itemPath = `/products/${encodeURIComponent(item.productSlug)}`;
  const itemPriceLabel = formatCatalogPrice(item.priceCentavos);
  const lineSubtotalLabel = formatCatalogPrice(item.priceCentavos * item.quantity);

  return (
    <article
      className="relative grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm sm:grid-cols-[84px_minmax(0,1fr)]"
      role="listitem"
    >
      <a
        className="block size-[84px] self-start hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        href={itemPath}
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

      <div className="grid min-w-0 gap-grid-sm pr-control-sm">
        <div className="grid gap-1">
          <div className="flex flex-wrap items-start justify-between gap-grid-xs">
            <div className="min-w-0">
              <h3 className="m-0 text-base font-bold [overflow-wrap:anywhere]">
                <a
                  className="no-underline hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                  href={itemPath}
                >
                  {item.productName}
                </a>
              </h3>
              <p className="m-0 text-sm text-brand-muted">{item.variantLabel}</p>
            </div>
          </div>

        </div>

        <div className="flex flex-wrap items-end gap-grid-xs">
          <div className="grid w-fit gap-1">
            <Label htmlFor={quantityInputId}>
              QUANTITY
            </Label>
            <div
              aria-label={`Quantity for ${item.productName} ${item.variantLabel}`}
              className="flex items-stretch gap-1"
              role="group"
            >
              <Button
                aria-label="Decrease quantity"
                disabled={item.quantity <= 1}
                onClick={() => applyQuantity(item.quantity - 1)}
                size="sm"
                square
              >
                <Minus aria-hidden="true" size={16} />
              </Button>
              <Input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={error ? "true" : undefined}
                className="w-14! !min-h-control-sm text-center font-system font-bold leading-none"
                id={quantityInputId}
                inputMode="numeric"
                max={item.maxQuantity}
                onBlur={() => {
                  if (draftQuantity !== String(item.quantity)) {
                    applyQuantity(draftQuantity);
                  }
                }}
                onChange={(event) => setDraftQuantity(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    applyQuantity(draftQuantity);
                  }
                }}
                textSize="sm"
                value={draftQuantity}
              />
              <Button
                aria-label="Increase quantity"
                disabled={item.quantity >= item.maxQuantity}
                onClick={() => applyQuantity(item.quantity + 1)}
                size="sm"
                square
              >
                <Plus aria-hidden="true" size={16} />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-1" aria-live="polite">
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
            <>
              <p className="brand-title-secondary m-0">
                Item price: {itemPriceLabel}
              </p>
              <p className="brand-title-big m-0">{lineSubtotalLabel}</p>
            </>
          )}
        </div>

        {isBlocked ? (
          <div className="flex flex-wrap items-center gap-grid-xs">
            <StatusBadge label={item.availabilityText} tone="error" />
            {item.availabilityStatus === "STALE" ? (
              <span className="text-xs font-bold uppercase text-brand-muted">
                Refresh needed
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <Button
        aria-label={`Remove ${item.productName} ${item.variantLabel}`}
        className="absolute right-grid-xs top-grid-xs"
        onClick={() => removeCartItemFromStore(item.productId, item.variantId)}
        size="sm"
        square
        title="Remove item"
        variant="ghost"
      >
        <X aria-hidden="true" size={16} />
      </Button>
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

