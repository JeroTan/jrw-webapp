import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, Skeleton, StatusBadge } from "@/components/feedback";
import { Button, ButtonLink } from "@/components/ui";
import { buildCustomerOrderTimeline } from "@/domain/orders/customer-order-status";
import { formatCatalogPrice } from "@/domain/products/price-format";
import { fetchAdminOrderDetail } from "../api";
import type { AdminOrderDetail } from "../types";

type LoadState = "loading" | "ready" | "failed" | "not-found";

export type AdminOrderDetailDashboardProps = {
  autoLoad?: boolean;
  initialLoadState?: LoadState;
  initialOrder?: AdminOrderDetail | null;
  orderId: string;
};

function statusTone(value: string) {
  if (/PAID|DELIVERED|SHIPPED|COMPLETED|SENT/.test(value)) {
    return "success" as const;
  }

  if (/FAILED|CANCELLED|EXPIRED|REJECTED|DECLINED/.test(value)) {
    return "warning" as const;
  }

  return "info" as const;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(parsed);
}

function optionLabel(
  options: AdminOrderDetail["items"][number]["variantOptions"]
) {
  return options.map((option) => `${option.group}: ${option.name}`).join(" / ");
}

function displayValue(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : "Not provided";
}

function addressLines(order: AdminOrderDetail): string[] {
  return [
    order.shippingAddress.streetAddress,
    order.shippingAddress.barangay,
    order.shippingAddress.cityProvince,
    order.shippingAddress.postalCode,
  ].filter((line): line is string => Boolean(line && line.trim().length > 0));
}

function LanePanel({
  label,
  updatedAt,
  value,
}: {
  label: string;
  updatedAt: string | null;
  value: string;
}) {
  return (
    <article className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
      <StatusBadge label={label} tone={statusTone(value)} />
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        {value}
      </p>
      <p className="m-0 text-sm text-brand-muted">
        Updated {formatDateTime(updatedAt)}
      </p>
    </article>
  );
}

export function AdminOrderDetailView({ order }: { order: AdminOrderDetail }) {
  const timeline = useMemo(
    () =>
      buildCustomerOrderTimeline({
        createdAt: order.createdAt,
        lanes: {
          fulfillment: order.fulfillment,
          payment: order.payment,
          refund: order.refund,
          return: order.return,
        },
        updatedAt: order.updatedAt,
      }),
    [order]
  );
  const shippingLines = addressLines(order);

  return (
    <section className="grid gap-grid-sm" aria-label="Admin order detail">
      <header className="grid gap-grid-xs border-b border-brand-border-strong py-grid-md md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="grid gap-1">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Read-only order truth
          </p>
          <h1 className="m-0 break-words font-heading text-[clamp(1.8rem,5vw,3rem)] font-bold text-brand-content">
            {order.orderNumber}
          </h1>
          <p className="m-0 text-sm text-brand-muted">
            Created {formatDateTime(order.createdAt)} / Updated{" "}
            {formatDateTime(order.updatedAt)}
          </p>
        </div>
        <ButtonLink href="/admin/orders" size="sm" textSize="xs">
          Back to orders
        </ButtonLink>
      </header>

      <section
        aria-label="Order totals"
        className="grid gap-grid-sm md:grid-cols-4"
      >
        <dl className="m-0 grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <dt className="font-system text-xs font-bold uppercase text-brand-muted">
            Customer
          </dt>
          <dd className="m-0 font-heading text-xl font-bold">
            {order.customerLabel}
          </dd>
          <dd className="m-0 text-sm text-brand-muted">
            {order.customerKind} / {order.checkoutEmailMasked ?? "No email"}
          </dd>
        </dl>
        <dl className="m-0 grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <dt className="font-system text-xs font-bold uppercase text-brand-muted">
            Items
          </dt>
          <dd className="m-0 font-heading text-xl font-bold">
            {order.totalQuantity}
          </dd>
          <dd className="m-0 text-sm text-brand-muted">
            {order.itemCount} line{order.itemCount === 1 ? "" : "s"}
          </dd>
        </dl>
        <dl className="m-0 grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <dt className="font-system text-xs font-bold uppercase text-brand-muted">
            Subtotal
          </dt>
          <dd className="m-0 font-heading text-xl font-bold">
            {formatCatalogPrice(order.subtotalCentavos)}
          </dd>
        </dl>
        <dl className="m-0 grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <dt className="font-system text-xs font-bold uppercase text-brand-muted">
            Total
          </dt>
          <dd className="m-0 font-heading text-xl font-bold text-brand-accent">
            {formatCatalogPrice(order.totalCentavos)}
          </dd>
        </dl>
      </section>

      <section aria-label="Order status lanes" className="grid gap-grid-sm">
        <div className="grid gap-1">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Separate lanes
          </p>
          <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
            Payment, fulfillment, return, refund
          </h2>
        </div>
        <div className="grid gap-grid-sm md:grid-cols-4">
          <LanePanel {...order.payment} />
          <LanePanel {...order.fulfillment} />
          <LanePanel {...order.return} />
          <LanePanel {...order.refund} />
        </div>
      </section>

      <section
        aria-label="Timeline"
        className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm"
      >
        <div className="grid gap-1">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Latest first
          </p>
          <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
            Status projection
          </h2>
        </div>
        <ol className="relative m-0 grid list-none gap-0 p-0 before:absolute before:bottom-0 before:left-0 before:top-grid-sm before:border-l before:border-brand-border-strong before:content-['']">
          {timeline.map((event, index) => (
            <li
              className="relative grid gap-1 border-b border-brand-border py-grid-sm pl-grid-md last:border-b-0"
              key={event.id}
            >
              <span
                aria-hidden="true"
                className={`absolute -left-[5px] top-grid-sm size-2 border border-current ${
                  index === 0
                    ? "bg-brand-accent text-brand-accent"
                    : "bg-brand-border-strong text-brand-border-strong"
                }`}
              />
              <div className="flex flex-wrap items-center gap-grid-xs">
                <StatusBadge label={event.label} tone={event.tone} />
                <span className="font-system text-xs uppercase text-brand-muted">
                  {formatDateTime(event.updatedAt)}
                </span>
              </div>
              <h3 className="m-0 font-heading text-lg font-bold text-brand-content">
                {event.title}
              </h3>
              <p className="m-0 max-w-[64ch] text-sm leading-relaxed text-brand-muted">
                {event.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-grid-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
            Snapshot items
          </h2>
          <ul className="m-0 grid list-none gap-0 border-t border-l border-brand-border p-0">
            {order.items.map((item, index) => (
              <li
                className="grid gap-grid-sm border-r border-b border-brand-border p-grid-sm md:grid-cols-[72px_minmax(0,1fr)_auto]"
                key={`${item.productName}-${item.variantLabel}-${index}`}
              >
                <div className="grid min-h-[72px] place-items-center border border-brand-border bg-brand-background font-system text-[0.65rem] font-bold uppercase text-brand-muted">
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
                    {item.quantity} x{" "}
                    {formatCatalogPrice(item.unitPriceCentavos)}
                  </p>
                </div>
                <p className="m-0 font-system text-sm font-bold text-brand-content md:text-right">
                  {formatCatalogPrice(item.lineTotalCentavos)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <aside className="grid content-start gap-grid-sm">
          <section className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
            <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
              Fulfillment contact
            </h2>
            <dl className="m-0 grid gap-grid-xs text-sm">
              <div>
                <dt className="font-system text-xs font-bold uppercase text-brand-muted">
                  Full name
                </dt>
                <dd className="m-0">{displayValue(order.contact.fullName)}</dd>
              </div>
              <div>
                <dt className="font-system text-xs font-bold uppercase text-brand-muted">
                  Email
                </dt>
                <dd className="m-0">
                  {displayValue(order.contact.checkoutEmail)}
                </dd>
              </div>
              <div>
                <dt className="font-system text-xs font-bold uppercase text-brand-muted">
                  Phone
                </dt>
                <dd className="m-0">{displayValue(order.contact.phone)}</dd>
              </div>
            </dl>
          </section>

          <section className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
            <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
              Shipping
            </h2>
            <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
              {order.shippingAddress.shippingType}
            </p>
            <p className="m-0 text-sm text-brand-content">
              {shippingLines.length > 0
                ? shippingLines.join(", ")
                : "No shipping address"}
            </p>
          </section>
        </aside>
      </section>
    </section>
  );
}

export function AdminOrderDetailDashboard({
  autoLoad = true,
  initialLoadState = "loading",
  initialOrder = null,
  orderId,
}: AdminOrderDetailDashboardProps) {
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [order, setOrder] = useState<AdminOrderDetail | null>(initialOrder);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    fetchAdminOrderDetail(orderId)
      .then((result) => {
        if (!active) {
          return;
        }

        setOrder(result);
        setLoadState("ready");
      })
      .catch((error: { status?: number }) => {
        if (!active) {
          return;
        }

        setLoadState(error.status === 404 ? "not-found" : "failed");
      });

    return () => {
      active = false;
    };
  }, [autoLoad, orderId, refreshToken]);

  return (
    <section className="grid gap-grid-sm">
      {loadState === "loading" ? (
        <div
          className="border border-brand-border-strong bg-brand-surface p-grid-sm"
          role="status"
        >
          <Skeleton label="Loading order detail" lines={8} />
        </div>
      ) : null}

      {loadState === "failed" ? (
        <div role="alert">
          <EmptyState
            action={
              <Button
                onClick={() => setRefreshToken((value) => value + 1)}
                size="sm"
              >
                Retry
              </Button>
            }
            message="Could not load order detail. Retry with an active approved admin session."
            title="Order unavailable"
          />
        </div>
      ) : null}

      {loadState === "not-found" ? (
        <EmptyState
          action={
            <ButtonLink href="/admin/orders" size="sm">
              Back to orders
            </ButtonLink>
          }
          message="Order id or order number was not found."
          title="Order not found"
        />
      ) : null}

      {loadState === "ready" && order ? (
        <AdminOrderDetailView order={order} />
      ) : null}
    </section>
  );
}
