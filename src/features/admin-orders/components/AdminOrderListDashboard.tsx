import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display";
import { EmptyState, Skeleton, StatusBadge } from "@/components/feedback";
import {
  Button,
  ButtonLink,
  Input,
  Pagination,
  SearchInput,
  Select,
} from "@/components/ui";
import { formatCatalogPrice } from "@/domain/products/price-format";
import { fetchAdminOrders } from "../api";
import type { AdminOrderList, AdminOrderSummary } from "../types";

type LoadState = "loading" | "ready" | "failed";

export type AdminOrderListDashboardProps = {
  autoLoad?: boolean;
  initialData?: AdminOrderList;
  initialLoadState?: LoadState;
};

const DEFAULT_DATA: AdminOrderList = {
  items: [],
  pagination: {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  },
};

const paymentStatusOptions = [
  ["", "All payments"],
  ["PAYMENT_PENDING", "Payment pending"],
  ["PAYMENT_PAID", "Payment paid"],
  ["PAYMENT_FAILED", "Payment failed"],
  ["PAYMENT_EXPIRED", "Payment expired"],
  ["PAYMENT_CANCELLED", "Payment cancelled"],
  ["PAYMENT_REFUNDED", "Payment refunded"],
] as const;

const fulfillmentStatusOptions = [
  ["", "All fulfillment"],
  ["ORDER_PLACED", "Order placed"],
  ["PROCESSING", "Processing"],
  ["SHIPPED", "Shipped"],
  ["DELIVERED", "Delivered"],
  ["CANCELLED", "Cancelled"],
] as const;

function statusTone(value: string) {
  if (/PAID|DELIVERED|SHIPPED|COMPLETED|SENT/.test(value)) {
    return "success" as const;
  }

  if (/FAILED|CANCELLED|EXPIRED|REJECTED|DECLINED/.test(value)) {
    return "warning" as const;
  }

  return "info" as const;
}

function formatDateTime(value: string): string {
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

function laneBadge(label: string, value: string) {
  return <StatusBadge label={label} tone={statusTone(value)} />;
}

export function AdminOrderListDashboard({
  autoLoad = true,
  initialData = DEFAULT_DATA,
  initialLoadState = "loading",
}: AdminOrderListDashboardProps) {
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);
  const [data, setData] = useState<AdminOrderList>(initialData);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [fulfillmentStatus, setFulfillmentStatus] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [page, setPage] = useState(initialData.pagination.page);
  const [pageSize, setPageSize] = useState(initialData.pagination.pageSize);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [
    createdFrom,
    createdTo,
    fulfillmentStatus,
    pageSize,
    paymentStatus,
    search,
  ]);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    let active = true;
    setLoadState("loading");

    fetchAdminOrders({
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined,
      fulfillmentStatus: fulfillmentStatus || undefined,
      page,
      pageSize,
      paymentStatus: paymentStatus || undefined,
      search: search.trim() || undefined,
    })
      .then((result) => {
        if (!active) {
          return;
        }

        setData(result);
        setPage(result.pagination.page);
        setPageSize(result.pagination.pageSize);
        setLoadState("ready");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setLoadState("failed");
      });

    return () => {
      active = false;
    };
  }, [
    autoLoad,
    createdFrom,
    createdTo,
    fulfillmentStatus,
    page,
    pageSize,
    paymentStatus,
    refreshToken,
    search,
  ]);

  const hasFilters =
    search.trim().length > 0 ||
    paymentStatus.length > 0 ||
    fulfillmentStatus.length > 0 ||
    createdFrom.length > 0 ||
    createdTo.length > 0;

  const columns = useMemo<Array<DataTableColumn<AdminOrderSummary>>>(
    () => [
      {
        key: "order",
        header: "Order",
        cell: (order) => (
          <div className="grid gap-0.5">
            <a
              className="font-bold text-brand-content underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
              href={`/admin/orders/${encodeURIComponent(order.orderId)}`}
            >
              {order.orderNumber}
            </a>
            <span className="text-xs text-brand-muted">{order.orderId}</span>
          </div>
        ),
      },
      {
        key: "customer",
        header: "Customer",
        cell: (order) => (
          <div className="grid gap-0.5">
            <span>{order.customerLabel}</span>
            <span className="text-xs text-brand-muted">
              {order.checkoutEmailMasked ?? "No checkout email"} /{" "}
              {order.customerKind}
            </span>
          </div>
        ),
      },
      {
        key: "items",
        header: "Items",
        cell: (order) =>
          `${order.totalQuantity} qty / ${order.itemCount} line${
            order.itemCount === 1 ? "" : "s"
          }`,
      },
      {
        key: "total",
        header: "Total",
        align: "right",
        cell: (order) => formatCatalogPrice(order.totalCentavos),
      },
      {
        key: "payment",
        header: "Payment",
        cell: (order) => laneBadge(order.payment.label, order.payment.value),
      },
      {
        key: "fulfillment",
        header: "Fulfillment",
        cell: (order) =>
          laneBadge(order.fulfillment.label, order.fulfillment.value),
      },
      {
        key: "support",
        header: "Return / Refund",
        cell: (order) => (
          <div className="flex flex-wrap gap-grid-xs">
            {laneBadge(order.return.label, order.return.value)}
            {laneBadge(order.refund.label, order.refund.value)}
          </div>
        ),
      },
      {
        key: "timestamps",
        header: "Created / Updated",
        cell: (order) => (
          <div className="grid gap-0.5">
            <span>{formatDateTime(order.createdAt)}</span>
            <span className="text-xs text-brand-muted">
              {formatDateTime(order.updatedAt)}
            </span>
          </div>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        cell: (order) => (
          <ButtonLink
            href={`/admin/orders/${encodeURIComponent(order.orderId)}`}
            size="sm"
            textSize="xs"
          >
            View
          </ButtonLink>
        ),
      },
    ],
    []
  );

  function resetFilters() {
    setSearch("");
    setPaymentStatus("");
    setFulfillmentStatus("");
    setCreatedFrom("");
    setCreatedTo("");
  }

  return (
    <section className="grid gap-grid-sm">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
        <div>
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Order operations
          </p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">Orders</h1>
          <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
            Review payment, fulfillment, return, and refund lanes for support
            and fulfillment work.
          </p>
        </div>
        <dl
          aria-label="Order summary"
          className="m-0 grid grid-cols-2 border border-brand-border-strong bg-brand-surface max-md:grid-cols-1 [&>div]:grid [&>div]:gap-grid-xs [&>div]:border-r [&>div]:border-brand-border [&>div]:p-grid-sm [&>div:last-child]:border-r-0 max-md:[&>div]:border-r-0 max-md:[&>div]:border-b max-md:[&>div:last-child]:border-b-0 [&_dd]:m-0 [&_dd]:font-heading [&_dd]:text-xl [&_dd]:font-bold [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:text-brand-muted"
        >
          <div>
            <dt>Total orders</dt>
            <dd>{loadState === "ready" ? data.pagination.totalItems : "-"}</dd>
          </div>
          <div>
            <dt>Visible rows</dt>
            <dd>{loadState === "ready" ? data.items.length : "-"}</dd>
          </div>
        </dl>
      </header>

      <section
        aria-label="Order filters"
        className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(150px,0.7fr))_auto] lg:items-end"
      >
        <SearchInput
          label="Search orders"
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Order, name, email"
          value={search}
        />
        <Select
          label="Payment"
          onChange={(event) => setPaymentStatus(event.currentTarget.value)}
          value={paymentStatus}
        >
          {paymentStatusOptions.map(([value, label]) => (
            <option key={value || "all-payment"} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Fulfillment"
          onChange={(event) => setFulfillmentStatus(event.currentTarget.value)}
          value={fulfillmentStatus}
        >
          {fulfillmentStatusOptions.map(([value, label]) => (
            <option key={value || "all-fulfillment"} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Input
          aria-label="Created from"
          onChange={(event) => setCreatedFrom(event.currentTarget.value)}
          type="date"
          value={createdFrom}
        />
        <Input
          aria-label="Created to"
          onChange={(event) => setCreatedTo(event.currentTarget.value)}
          type="date"
          value={createdTo}
        />
        <Button
          disabled={!hasFilters}
          onClick={resetFilters}
          size="md"
          textSize="xs"
        >
          Reset
        </Button>
      </section>

      <section className="grid gap-grid-sm py-grid-md">
        {loadState === "loading" ? (
          <div
            className="border border-brand-border-strong bg-brand-surface p-grid-sm"
            role="status"
          >
            <Skeleton label="Loading order table" lines={7} />
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
              message="Could not load orders. Retry with an active approved admin session."
              title="Orders unavailable"
            />
          </div>
        ) : null}

        {loadState === "ready" && data.pagination.totalItems === 0 ? (
          <EmptyState
            action={
              hasFilters ? (
                <Button onClick={resetFilters} size="sm">
                  Reset filters
                </Button>
              ) : undefined
            }
            message={
              hasFilters
                ? "No orders match current filters."
                : "Orders appear here after checkout and payment flow creates them."
            }
            title={hasFilters ? "No matching orders" : "No orders yet"}
          />
        ) : null}

        {loadState === "ready" && data.pagination.totalItems > 0 ? (
          <DataTable
            caption="Admin order list"
            columns={columns}
            emptyMessage="No orders found."
            getRowId={(order) => order.orderId}
            rows={data.items}
          />
        ) : null}

        {loadState === "ready" && data.pagination.totalItems > 0 ? (
          <Pagination
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            page={data.pagination.page}
            pageSize={data.pagination.pageSize}
            totalItems={data.pagination.totalItems}
            totalPages={data.pagination.totalPages}
          />
        ) : null}
      </section>
    </section>
  );
}
