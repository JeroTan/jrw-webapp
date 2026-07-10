import * as React from "react";
import { useEffect, useState } from "react";
import { OrderTimelineEvents } from "@/components/data-display";
import { ButtonLink } from "@/components/ui";
import { buildCustomerOrderTimeline } from "@/domain/orders/customer-order-status";
import { formatCatalogPrice } from "@/domain/products/price-format";
import { AccountDashboardShell } from "./components/AccountDashboardShell";
import {
  CustomerAccountApiError,
  getCustomerOrder,
  type CustomerOrderDetail,
} from "./api";

function optionLabel(
  options: CustomerOrderDetail["items"][number]["variantOptions"]
) {
  return options.map((option) => `${option.group}: ${option.name}`).join(" / ");
}

function productImageSrc(r2Key: string | null) {
  const cleanKey = r2Key?.trim().replace(/^products\//, "");

  if (!cleanKey) {
    return null;
  }

  return `/assets/products/${cleanKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function itemVariantLabel(item: CustomerOrderDetail["items"][number]) {
  const variantLabel = item.variantLabel.trim();
  const options = optionLabel(item.variantOptions);
  const optionNames = new Set(
    item.variantOptions.map((option) => normalizeLabel(option.name))
  );
  const optionLabels = new Set(
    item.variantOptions.map((option) =>
      normalizeLabel(`${option.group}: ${option.name}`)
    )
  );
  const variantParts = variantLabel
    .split(/[\/,|]+/)
    .map(normalizeLabel)
    .filter(Boolean);
  const variantDuplicatesOptions =
    Boolean(variantLabel) &&
    (optionNames.has(normalizeLabel(variantLabel)) ||
      optionLabels.has(normalizeLabel(variantLabel)) ||
      (variantParts.length > 1 &&
        variantParts.every((part) => optionNames.has(part))));

  return [variantDuplicatesOptions ? "" : variantLabel, options]
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .join(" / ");
}

export function CustomerOrderDetailView({
  order,
}: {
  order: CustomerOrderDetail;
}) {
  const timeline = buildCustomerOrderTimeline({
    createdAt: order.createdAt,
    lanes: {
      fulfillment: order.fulfillment,
      payment: order.payment,
      refund: order.refund,
      return: order.return,
    },
    updatedAt: order.updatedAt,
  });
  return (
    <section className="grid gap-grid-sm" aria-label="Customer order detail">
      <div className="grid gap-grid-xs border-b border-brand-border pb-grid-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="grid gap-1">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Order detail
          </p>
          <h1 className="m-0 break-words font-heading text-2xl font-bold text-brand-content">
            {order.orderNumber}
          </h1>
        </div>
        <ButtonLink className="w-fit" href="/account/orders" textSize="xs">
          Back to orders
        </ButtonLink>
      </div>

      <OrderTimelineEvents
        heading="Order status"
        subheading="Latest update first"
        timeline={timeline}
      />

      <section className="grid gap-grid-xs rounded-none border border-brand-border-strong bg-brand-surface p-grid-sm">
        <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
          Items
        </h2>
        <ul className="m-0 grid list-none gap-0 border-t border-l border-brand-border p-0">
          {order.items.map((item, index) => {
            const imageSrc = productImageSrc(item.imageR2Key);
            const variantLabel = itemVariantLabel(item);

            return (
              <li
                className="grid gap-grid-sm border-r border-b border-brand-border p-grid-sm md:grid-cols-[72px_minmax(0,1fr)_auto]"
                key={`${item.productName}-${item.variantLabel}-${index}`}
              >
                {imageSrc ? (
                  <img
                    alt={item.productName}
                    className="size-[72px] rounded-none border border-brand-border object-cover"
                    height="72"
                    src={imageSrc}
                    width="72"
                  />
                ) : (
                  <div className="grid size-[72px] place-items-center rounded-none border border-brand-border bg-brand-background font-system text-[0.65rem] font-bold uppercase text-brand-muted">
                    No image
                  </div>
                )}
                <div className="grid min-w-0 gap-1">
                  <p className="m-0 break-words font-heading text-lg font-bold text-brand-content">
                    {item.productName}
                  </p>
                  {variantLabel ? (
                    <p className="m-0 text-sm text-brand-muted">
                      {variantLabel}
                    </p>
                  ) : null}
                  <p className="m-0 font-system text-xs text-brand-muted">
                    {item.quantity} x{" "}
                    {formatCatalogPrice(item.unitPriceCentavos)}
                  </p>
                </div>
                <p className="m-0 font-system text-sm font-bold text-brand-content md:text-right">
                  {formatCatalogPrice(item.lineTotalCentavos)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <dl className="grid gap-grid-xs rounded-none border border-brand-border-strong bg-brand-background p-grid-sm font-system text-sm">
        <div className="flex flex-wrap justify-between gap-grid-xs">
          <dt className="text-brand-muted">Subtotal</dt>
          <dd className="m-0 font-bold">
            {formatCatalogPrice(order.subtotalCentavos)}
          </dd>
        </div>
        <div className="flex flex-wrap justify-between gap-grid-xs">
          <dt className="text-brand-muted">Total</dt>
          <dd className="m-0 font-bold">
            {formatCatalogPrice(order.totalCentavos)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function CustomerOrderUnavailable({ message }: { message: string }) {
  return (
    <p
      className="rounded-none border border-brand-danger bg-brand-surface p-grid-xs text-sm text-brand-danger"
      role="alert"
    >
      {message}
    </p>
  );
}

export function CustomerOrderDetailPanel({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getCustomerOrder(orderId)
      .then((loadedOrder) => {
        if (!mounted) return;
        setOrder(loadedOrder);
      })
      .catch((loadError) => {
        if (!mounted) return;
        if (
          loadError instanceof CustomerAccountApiError &&
          (loadError.status === 401 || loadError.status === 403)
        ) {
          window.location.replace(
            `/account/sign-in?returnTo=/account/orders/${encodeURIComponent(
              orderId
            )}`
          );
          return;
        }
        setError(
          loadError instanceof CustomerAccountApiError &&
            loadError.status === 404
            ? "Order not found."
            : "We could not load this order. Please try again."
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [orderId]);

  return (
    <AccountDashboardShell
      currentSection="orders"
      description="Track payment, delivery, returns, and refunds."
      title="Order detail"
    >
      {loading ? (
        <p className="rounded-none border border-brand-border bg-brand-background p-grid-sm text-sm text-brand-muted">
          Loading order...
        </p>
      ) : error || !order ? (
        <CustomerOrderUnavailable message={error ?? "Order unavailable."} />
      ) : (
        <CustomerOrderDetailView order={order} />
      )}
    </AccountDashboardShell>
  );
}
