import * as React from "react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/feedback";
import { ButtonLink } from "@/components/ui";
import { formatCatalogPrice } from "@/domain/products/price-format";
import { AccountDashboardShell } from "./components/AccountDashboardShell";
import {
  CustomerAccountApiError,
  getCustomerOrders,
  type CustomerOrderList,
  type CustomerOrderPagination,
  type CustomerOrderSummary,
} from "./api";

function orderDateLabel(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeZone: "Asia/Manila",
      }).format(date);
}

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

function LaneBadge({ label, value }: { label: string; value: string }) {
  return <StatusBadge label={label} tone={statusTone(value)} />;
}

function OrdersEmptyState() {
  return (
    <section className="grid gap-grid-sm rounded-none border border-brand-border-strong bg-brand-surface p-grid-sm">
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        Orders
      </p>
      <h2 className="m-0 font-heading text-2xl font-bold text-brand-content">
        No orders yet
      </h2>
      <p className="m-0 max-w-[60ch] text-sm text-brand-muted">
        Completed checkouts will appear here after payment confirmation.
      </p>
      <ButtonLink className="w-fit" href="/products" textSize="xs">
        Browse products
      </ButtonLink>
    </section>
  );
}

export function CustomerOrdersView({
  orders,
  pagination,
}: {
  orders: CustomerOrderSummary[];
  pagination: CustomerOrderPagination;
}) {
  if (orders.length === 0) {
    return <OrdersEmptyState />;
  }

  return (
    <section className="grid gap-grid-sm" aria-label="Customer order history">
      <div className="grid gap-1 border-b border-brand-border pb-grid-sm">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          {pagination.totalItems} order{pagination.totalItems === 1 ? "" : "s"}
        </p>
        <h1 className="m-0 font-heading text-2xl font-bold text-brand-content">
          Your orders
        </h1>
      </div>

      <div className="grid border-t border-l border-brand-border-strong">
        {orders.map((order) => (
          <article
            className="grid gap-grid-sm rounded-none border-r border-b border-brand-border-strong bg-brand-surface p-grid-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
            key={order.orderId}
          >
            <div className="grid min-w-0 gap-grid-xs">
              <div className="flex flex-wrap items-center gap-grid-xs">
                <h2 className="m-0 break-words font-heading text-xl font-bold text-brand-content">
                  {order.orderNumber}
                </h2>
                <span className="font-system text-xs font-bold uppercase text-brand-muted">
                  {orderDateLabel(order.createdAt)}
                </span>
              </div>
              <p className="m-0 text-sm text-brand-muted">
                {order.totalQuantity} item
                {order.totalQuantity === 1 ? "" : "s"} across {order.itemCount}{" "}
                line{order.itemCount === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap gap-grid-xs">
                <LaneBadge
                  label={order.payment.label}
                  value={order.payment.value}
                />
                <LaneBadge
                  label={order.fulfillment.label}
                  value={order.fulfillment.value}
                />
                <LaneBadge
                  label={order.return.label}
                  value={order.return.value}
                />
                <LaneBadge
                  label={order.refund.label}
                  value={order.refund.value}
                />
              </div>
            </div>

            <div className="grid gap-grid-xs md:justify-items-end">
              <p className="m-0 font-heading text-2xl font-bold text-brand-accent">
                {formatCatalogPrice(order.totalCentavos)}
              </p>
              <ButtonLink
                href={`/account/orders/${encodeURIComponent(order.orderId)}`}
                textSize="xs"
              >
                View order
              </ButtonLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CustomerOrdersUnavailable({ message }: { message: string }) {
  return (
    <p
      className="rounded-none border border-brand-danger bg-brand-surface p-grid-xs text-sm text-brand-danger"
      role="alert"
    >
      {message}
    </p>
  );
}

export function CustomerOrdersPanel() {
  const [data, setData] = useState<CustomerOrderList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getCustomerOrders()
      .then((orders) => {
        if (!mounted) return;
        setData(orders);
      })
      .catch((loadError) => {
        if (!mounted) return;
        if (
          loadError instanceof CustomerAccountApiError &&
          (loadError.status === 401 || loadError.status === 403)
        ) {
          window.location.replace("/account/sign-in?returnTo=/account/orders");
          return;
        }
        setError("We could not load your orders. Please try again.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AccountDashboardShell
      currentSection="orders"
      description="Track payment, fulfillment, return, and refund status."
      title="Your orders"
    >
      {loading ? (
        <p className="rounded-none border border-brand-border bg-brand-background p-grid-sm text-sm text-brand-muted">
          Loading orders...
        </p>
      ) : error || !data ? (
        <CustomerOrdersUnavailable message={error ?? "Orders unavailable."} />
      ) : (
        <CustomerOrdersView orders={data.items} pagination={data.pagination} />
      )}
    </AccountDashboardShell>
  );
}
