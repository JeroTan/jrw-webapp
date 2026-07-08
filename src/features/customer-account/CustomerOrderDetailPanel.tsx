import * as React from "react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/feedback";
import { ButtonLink } from "@/components/ui";
import { formatCatalogPrice } from "@/domain/products/price-format";
import { AccountDashboardShell } from "./components/AccountDashboardShell";
import {
  CustomerAccountApiError,
  getCustomerOrder,
  type CustomerOrderDetail,
  type CustomerOrderStatusLane,
} from "./api";

function statusTone(value: string) {
  if (/PAID|DELIVERED|SHIPPED|COMPLETED|SENT/.test(value)) {
    return "success" as const;
  }

  if (/PENDING|PROCESSING|PLACED|REQUESTED/.test(value)) {
    return "info" as const;
  }

  if (/FAILED|CANCELLED|EXPIRED|REJECTED|DECLINED/.test(value)) {
    return "warning" as const;
  }

  return "info" as const;
}

function TimelineLane({
  lane,
  title,
}: {
  lane: CustomerOrderStatusLane;
  title: string;
}) {
  return (
    <article className="grid gap-grid-xs rounded-none border border-brand-border-strong bg-brand-surface p-grid-sm">
      <StatusBadge label={lane.label} tone={statusTone(lane.value)} />
      <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
        {title}
      </h2>
      <p className="m-0 font-system text-xs uppercase text-brand-muted">
        {lane.value}
      </p>
    </article>
  );
}

function optionLabel(
  options: CustomerOrderDetail["items"][number]["variantOptions"]
) {
  return options.map((option) => `${option.group}: ${option.name}`).join(" / ");
}

export function CustomerOrderDetailView({
  order,
}: {
  order: CustomerOrderDetail;
}) {
  return (
    <section className="grid gap-grid-sm" aria-label="Customer order detail">
      <div className="grid gap-grid-xs border-b border-brand-border pb-grid-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="grid gap-1">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Order truth timeline
          </p>
          <h1 className="m-0 break-words font-heading text-2xl font-bold text-brand-content">
            {order.orderNumber}
          </h1>
        </div>
        <ButtonLink className="w-fit" href="/account/orders" textSize="xs">
          Back to orders
        </ButtonLink>
      </div>

      <div className="grid grid-cols-1 gap-grid-sm md:grid-cols-4">
        <TimelineLane lane={order.payment} title="Payment" />
        <TimelineLane lane={order.fulfillment} title="Fulfillment" />
        <TimelineLane lane={order.return} title="Return" />
        <TimelineLane lane={order.refund} title="Refund" />
      </div>

      <section className="grid gap-grid-xs rounded-none border border-brand-border-strong bg-brand-surface p-grid-sm">
        <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
          Items
        </h2>
        <ul className="m-0 grid list-none gap-0 border-t border-l border-brand-border p-0">
          {order.items.map((item, index) => (
            <li
              className="grid gap-grid-sm border-r border-b border-brand-border p-grid-sm md:grid-cols-[72px_minmax(0,1fr)_auto]"
              key={`${item.productName}-${item.variantLabel}-${index}`}
            >
              <div className="grid min-h-[72px] place-items-center rounded-none border border-brand-border bg-brand-background font-system text-[0.65rem] font-bold uppercase text-brand-muted">
                {item.imageR2Key ? "Snapshot" : "No image"}
              </div>
              <div className="grid min-w-0 gap-1">
                <p className="m-0 break-words font-heading text-lg font-bold text-brand-content">
                  {item.productName}
                </p>
                <p className="m-0 text-sm text-brand-muted">
                  {item.variantLabel}
                  {item.variantOptions.length > 0
                    ? ` / ${optionLabel(item.variantOptions)}`
                    : ""}
                </p>
                <p className="m-0 font-system text-xs text-brand-muted">
                  {item.quantity} x {formatCatalogPrice(item.unitPriceCentavos)}
                </p>
              </div>
              <p className="m-0 font-system text-sm font-bold text-brand-content md:text-right">
                {formatCatalogPrice(item.lineTotalCentavos)}
              </p>
            </li>
          ))}
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
      description="Track payment, fulfillment, return, and refund status."
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
