import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBadge } from "@/components/feedback";
import { Button, ButtonLink } from "@/components/ui";
import { buildCustomerOrderTimeline } from "@/domain/orders/customer-order-status";
import { formatCatalogPrice } from "@/domain/products/price-format";
import { Check, Copy } from "lucide-react";
import { AccountDashboardShell } from "./components/AccountDashboardShell";
import {
  CustomerAccountApiError,
  getCustomerOrders,
  type CustomerOrderList,
  type CustomerOrderPagination,
  type CustomerOrderSummary,
} from "./api";

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

function orderDateLabel(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.valueOf())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        timeZone: "Asia/Manila",
      }).format(date);
}

function optionLabel(
  options: CustomerOrderSummary["items"][number]["variantOptions"]
) {
  return options.map((option) => `${option.group}: ${option.name}`).join(" / ");
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function itemVariantLabel(item: CustomerOrderSummary["items"][number]) {
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

function primaryOrderTitle(order: CustomerOrderSummary) {
  const firstItem = order.items[0];

  return firstItem?.productName ?? order.orderNumber;
}

function additionalItemCount(order: CustomerOrderSummary) {
  return Math.max(0, order.itemCount - 1);
}

function orderItemsPopoverId(orderId: string) {
  return `order-items-${orderId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function totalItemsLabel(order: CustomerOrderSummary) {
  return `Total items: ${order.totalQuantity}`;
}

function latestOrderStatus(order: CustomerOrderSummary) {
  return buildCustomerOrderTimeline({
    createdAt: order.createdAt,
    lanes: {
      fulfillment: order.fulfillment,
      payment: order.payment,
      refund: order.refund,
      return: order.return,
    },
    updatedAt: order.updatedAt,
  })[0];
}

function MoreOrderItemsBadge({
  onClose,
  onToggle,
  open,
  order,
}: {
  onClose: () => void;
  onToggle: () => void;
  open: boolean;
  order: CustomerOrderSummary;
}) {
  const moreCount = additionalItemCount(order);

  if (moreCount <= 0) {
    return null;
  }

  const popoverId = orderItemsPopoverId(order.orderId);

  return (
    <span
      className="group relative inline-flex"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          onClose();
        }
      }}
    >
      <Button
        aria-controls={popoverId}
        aria-expanded={open}
        aria-label={`Show ${moreCount} more order item${
          moreCount === 1 ? "" : "s"
        }`}
        className="min-h-0 py-1"
        onClick={onToggle}
        paddingX="xs"
        size="sm"
        textSize="xs"
        title={`Show ${moreCount} more order item${moreCount === 1 ? "" : "s"}`}
        variant="secondary"
      >
        + {moreCount} more
      </Button>
      <div
        aria-label="Order item summary"
        className={`absolute left-0 top-full z-20 mt-1 w-[min(22rem,calc(100vw-2rem))] gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-xs shadow-none ${
          open ? "grid" : "hidden"
        } group-hover:grid group-focus-within:grid`}
        id={popoverId}
        role="list"
      >
        {order.items.map((item, index) => (
          <div
            className="grid gap-1 border-b border-brand-border pb-grid-xs last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-baseline"
            key={`${item.productName}-${item.variantLabel}-${index}`}
            role="listitem"
          >
            <p className="m-0 break-words text-sm font-bold text-brand-content">
              {item.productName}
            </p>
            <p className="m-0 font-system text-xs uppercase text-brand-muted">
              Qty {item.quantity}
            </p>
            <p className="m-0 font-system text-xs font-bold text-brand-content sm:text-right">
              {formatCatalogPrice(item.lineTotalCentavos)}
            </p>
          </div>
        ))}
      </div>
    </span>
  );
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
  loadMoreError = null,
  loadingMore = false,
  onLoadMore,
  orders,
  pagination,
}: {
  loadMoreError?: string | null;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  orders: CustomerOrderSummary[];
  pagination: CustomerOrderPagination;
}) {
  const [copiedOrderNumber, setCopiedOrderNumber] = useState<string | null>(
    null
  );
  const [openItemsOrderId, setOpenItemsOrderId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasMoreOrders = pagination.page < pagination.totalPages;
  const showLoadMoreFooter =
    Boolean(onLoadMore) &&
    (pagination.totalPages > 1 || loadingMore || Boolean(loadMoreError));
  const loadedItemsLabel = `Showing ${orders.length} of ${
    pagination.totalItems
  } order${pagination.totalItems === 1 ? "" : "s"}`;

  useEffect(() => {
    if (!copiedOrderNumber) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedOrderNumber(null);
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [copiedOrderNumber]);

  useEffect(() => {
    if (!onLoadMore || !hasMoreOrders || loadingMore) {
      return;
    }

    const target = loadMoreRef.current;

    if (!target || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      { rootMargin: "360px 0px" }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMoreOrders, loadingMore, onLoadMore]);

  async function copyOrderNumber(orderNumber: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedOrderNumber(orderNumber);
    } catch {
      setCopiedOrderNumber(null);
    }
  }

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
        {orders.map((order) => {
          const latestStatus = latestOrderStatus(order);
          const primaryItem = order.items[0];
          const primaryImageSrc = primaryItem
            ? productImageSrc(primaryItem.imageR2Key)
            : null;
          const copied = copiedOrderNumber === order.orderNumber;
          const OrderNumberIcon = copied ? Check : Copy;
          const itemsPopoverOpen = openItemsOrderId === order.orderId;

          return (
            <article
              className="grid gap-grid-sm rounded-none border-r border-b border-brand-border-strong bg-brand-surface p-grid-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
              key={order.orderId}
            >
              <div className="grid min-w-0 gap-grid-sm sm:grid-cols-[84px_minmax(0,1fr)]">
                {primaryItem ? (
                  <div className="size-[84px] self-start">
                    {primaryImageSrc ? (
                      <img
                        alt={primaryItem.productName}
                        className="size-[84px] border border-brand-border-strong object-cover"
                        height="84"
                        src={primaryImageSrc}
                        width="84"
                      />
                    ) : (
                      <span
                        aria-label={`${primaryItem.productName} image coming soon`}
                        className={imageFallbackClass}
                        role="img"
                      >
                        {productInitials(primaryItem.productName)}
                      </span>
                    )}
                  </div>
                ) : null}

                <div className="grid min-w-0 gap-1">
                  <div className="flex flex-wrap items-center gap-grid-xs">
                    {latestStatus ? (
                      <StatusBadge
                        label={latestStatus.label}
                        tone={latestStatus.tone}
                      />
                    ) : null}
                    <span className="font-system text-xs font-bold uppercase text-brand-muted">
                      {orderDateLabel(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-grid-xs">
                    <h2 className="m-0 break-words font-heading text-xl font-bold text-brand-content">
                      {primaryOrderTitle(order)}
                    </h2>
                    <MoreOrderItemsBadge
                      onClose={() =>
                        setOpenItemsOrderId((current) =>
                          current === order.orderId ? null : current
                        )
                      }
                      onToggle={() =>
                        setOpenItemsOrderId((current) =>
                          current === order.orderId ? null : order.orderId
                        )
                      }
                      open={itemsPopoverOpen}
                      order={order}
                    />
                  </div>
                  {primaryItem && itemVariantLabel(primaryItem) ? (
                    <p className="m-0 text-sm text-brand-muted">
                      {itemVariantLabel(primaryItem)}
                    </p>
                  ) : null}
                  {primaryItem ? (
                    <p className="m-0 font-system text-xs text-brand-muted">
                      {primaryItem.quantity} x{" "}
                      {formatCatalogPrice(primaryItem.unitPriceCentavos)}
                    </p>
                  ) : null}
                  {latestStatus ? (
                    <p className="m-0 text-sm font-bold text-brand-content">
                      {latestStatus.title}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-grid-xs">
                    <p className="m-0 font-system text-xs uppercase text-brand-muted">
                      Order {order.orderNumber}
                    </p>
                    <Button
                      aria-label={
                        copied
                          ? `Copied order ID ${order.orderNumber}`
                          : `Copy order ID ${order.orderNumber}`
                      }
                      onClick={() => void copyOrderNumber(order.orderNumber)}
                      size="sm"
                      square
                      textSize="xs"
                      title={copied ? "Copied order ID" : "Copy order ID"}
                      variant="secondary"
                    >
                      <OrderNumberIcon aria-hidden="true" size={14} />
                    </Button>
                  </div>
                </div>

                <p className="m-0 text-sm text-brand-muted sm:col-span-2">
                  {totalItemsLabel(order)}
                </p>
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
          );
        })}
      </div>

      {showLoadMoreFooter ? (
        <div
          aria-live="polite"
          className="flex flex-wrap items-center justify-between gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-xs"
          ref={loadMoreRef}
        >
          <div className="grid gap-1">
            <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
              {loadingMore
                ? "Loading older orders..."
                : hasMoreOrders
                  ? loadedItemsLabel
                  : `All ${pagination.totalItems} order${
                      pagination.totalItems === 1 ? "" : "s"
                    } loaded.`}
            </p>
            {loadMoreError ? (
              <p className="m-0 text-sm text-brand-danger" role="alert">
                {loadMoreError}
              </p>
            ) : null}
          </div>
          {hasMoreOrders && onLoadMore ? (
            <Button disabled={loadingMore} onClick={onLoadMore} textSize="xs">
              {loadMoreError ? "Retry older orders" : "Load older orders"}
            </Button>
          ) : null}
        </div>
      ) : null}
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    setError(null);
    setLoading(true);
    setLoadMoreError(null);
    getCustomerOrders({ page: 1 })
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

  const loadMoreOrders = useCallback(() => {
    if (
      !data ||
      loadingMore ||
      data.pagination.page >= data.pagination.totalPages
    ) {
      return;
    }

    const nextPage = data.pagination.page + 1;

    setLoadingMore(true);
    setLoadMoreError(null);
    getCustomerOrders({ page: nextPage })
      .then((orders) => {
        if (!mountedRef.current) {
          return;
        }

        setData((current) => {
          if (!current) {
            return orders;
          }

          const existingOrderIds = new Set(
            current.items.map((order) => order.orderId)
          );
          const newItems = orders.items.filter(
            (order) => !existingOrderIds.has(order.orderId)
          );

          return {
            items: [...current.items, ...newItems],
            pagination: orders.pagination,
          };
        });
      })
      .catch((loadError) => {
        if (!mountedRef.current) {
          return;
        }

        if (
          loadError instanceof CustomerAccountApiError &&
          (loadError.status === 401 || loadError.status === 403)
        ) {
          window.location.replace("/account/sign-in?returnTo=/account/orders");
          return;
        }
        setLoadMoreError("We could not load older orders. Please retry.");
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoadingMore(false);
        }
      });
  }, [data, loadingMore]);

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
        <CustomerOrdersView
          loadMoreError={loadMoreError}
          loadingMore={loadingMore}
          onLoadMore={loadMoreOrders}
          orders={data.items}
          pagination={data.pagination}
        />
      )}
    </AccountDashboardShell>
  );
}
