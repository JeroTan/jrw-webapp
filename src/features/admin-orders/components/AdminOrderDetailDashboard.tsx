import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState, Skeleton, StatusBadge } from "@/components/feedback";
import { Button, ButtonLink, Input, Select, Textarea } from "@/components/ui";
import { buildCustomerOrderTimeline } from "@/domain/orders/customer-order-status";
import {
  allowedNextFulfillmentStatuses,
  fulfillmentStatusLabel,
  isFulfillmentStatus,
  type FulfillmentStatus,
} from "@/domain/orders/fulfillment-transitions";
import {
  allowedNextReturnStatuses,
  isReturnStatus,
  returnStatusLabel,
} from "@/domain/orders/return-transitions";
import {
  allowedNextRefundStatuses,
  isRefundStatus,
  refundStatusLabel,
} from "@/domain/orders/refund-transitions";
import { formatCatalogPrice } from "@/domain/products/price-format";
import {
  fetchAdminOrderDetail,
  recordAdminOrderRefund,
  recordAdminOrderReturn,
  updateAdminOrderFulfillment,
  type AdminOrderApiFailure,
} from "../api";
import type {
  AdminFulfillmentEmailStatus,
  AdminFulfillmentStatus,
  AdminOrderDetail,
  AdminRefundRecordRequest,
  AdminRefundStatus,
  AdminRefundTargetType,
  AdminReturnRecordRequest,
  AdminReturnStatus,
  AdminReturnTargetType,
} from "../types";

type LoadState = "loading" | "ready" | "failed" | "not-found";
type FulfillmentActionMessage = {
  tone: "info" | "success" | "warning";
  text: string;
};
type ReturnActionMessage = FulfillmentActionMessage;
type RefundActionMessage = FulfillmentActionMessage;
type FulfillmentActionRow = {
  label: string;
  targetStatus: AdminFulfillmentStatus;
  variant: "danger" | "primary" | "secondary";
};
const returnHistoryActionLabel: Partial<Record<AdminReturnStatus, string>> = {
  RETURN_APPROVED: "Approve return",
  RETURN_CANCELLED: "Cancel return",
  RETURN_COMPLETED: "Complete return",
  RETURN_RECEIVED: "Mark received",
  RETURN_REJECTED: "Decline return",
};
const refundHistoryActionLabel: Partial<Record<AdminRefundStatus, string>> = {
  REFUND_APPROVED: "Approve refund",
  REFUND_DECLINED: "Decline refund",
  REFUND_FAILED: "Mark failed",
  REFUND_SENT: "Mark sent",
};

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

function fulfillmentActionLabel(status: FulfillmentStatus): string {
  switch (status) {
    case "PROCESSING":
      return "Start processing";
    case "SHIPPED":
      return "Mark as shipped";
    case "DELIVERED":
      return "Mark as delivered";
    case "CANCELLED":
      return "Cancel order";
    case "ORDER_PLACED":
      return "Mark as received";
  }
}

function fulfillmentActionVariant(status: FulfillmentStatus) {
  return status === "CANCELLED" ? ("danger" as const) : ("primary" as const);
}

function returnTargetKey(record: {
  orderSnapshotId: string | null;
  targetType: AdminReturnTargetType;
}) {
  return record.targetType === "ORDER"
    ? "ORDER"
    : `ITEM:${record.orderSnapshotId ?? ""}`;
}

function returnedItemIds(order: AdminOrderDetail) {
  return new Set(
    order.returnHistory
      .filter(
        (record) => record.targetType === "ITEM" && record.orderSnapshotId
      )
      .map((record) => record.orderSnapshotId as string)
  );
}

function refundTargetKey(record: {
  orderSnapshotId: string | null;
  targetType: AdminRefundTargetType;
}) {
  return record.targetType === "ORDER"
    ? "ORDER"
    : `ITEM:${record.orderSnapshotId ?? ""}`;
}

function refundedItemIds(order: AdminOrderDetail) {
  return new Set(
    order.refundHistory
      .filter(
        (record) => record.targetType === "ITEM" && record.orderSnapshotId
      )
      .map((record) => record.orderSnapshotId as string)
  );
}

function refundActionVariant(status: AdminRefundStatus) {
  return status === "REFUND_DECLINED" || status === "REFUND_FAILED"
    ? ("danger" as const)
    : status === "REFUND_SENT"
      ? ("primary" as const)
      : ("secondary" as const);
}

export function fulfillmentActionRows(
  order: AdminOrderDetail
): FulfillmentActionRow[] {
  if (order.payment.value !== "PAYMENT_PAID") {
    return [];
  }

  if (!isFulfillmentStatus(order.fulfillment.value)) {
    return [];
  }

  return allowedNextFulfillmentStatuses(order.fulfillment.value).map(
    (targetStatus) => ({
      label: fulfillmentActionLabel(targetStatus),
      targetStatus,
      variant: fulfillmentActionVariant(targetStatus),
    })
  );
}

function fulfillmentBlockedReason(order: AdminOrderDetail): string | null {
  if (order.payment.value !== "PAYMENT_PAID") {
    return "Fulfillment locked until payment is paid.";
  }

  if (!isFulfillmentStatus(order.fulfillment.value)) {
    return "Current fulfillment status cannot be changed.";
  }

  if (allowedNextFulfillmentStatuses(order.fulfillment.value).length === 0) {
    return `${fulfillmentStatusLabel(order.fulfillment.value)} is final.`;
  }

  return null;
}

function returnBlockedReason(order: AdminOrderDetail): string | null {
  if (order.payment.value !== "PAYMENT_PAID") {
    return "Return locked until payment is paid.";
  }

  if (order.fulfillment.value !== "DELIVERED") {
    return "Return available after delivery.";
  }

  if (
    order.return.value !== "RETURN_NOT_REQUESTED" &&
    !isReturnStatus(order.return.value)
  ) {
    return "Current return status cannot be changed.";
  }

  return null;
}

function refundBlockedReason(order: AdminOrderDetail): string | null {
  if (order.payment.value !== "PAYMENT_PAID") {
    return "Refund locked until payment is paid.";
  }

  if (
    order.refund.value !== "REFUND_NOT_REQUESTED" &&
    !isRefundStatus(order.refund.value)
  ) {
    return "Current refund status cannot be changed.";
  }

  return null;
}

function fulfillmentEmailMessage(status: AdminFulfillmentEmailStatus): string {
  switch (status) {
    case "SENT":
      return "Fulfillment updated. Customer email sent.";
    case "SENDING":
      return "Fulfillment updated. Customer email already sending.";
    case "FAILED":
      return "Fulfillment updated. Customer email needs retry.";
    case "PENDING":
      return "Fulfillment updated. Customer email queued.";
  }
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
      <p className="m-0 text-sm text-brand-muted">
        Last updated {formatDateTime(updatedAt)}
      </p>
    </article>
  );
}

function customerKindLabel(kind: AdminOrderDetail["customerKind"]): string {
  return kind === "CUSTOMER" ? "Customer account" : "Guest checkout";
}

function CollapsibleAdminPanel({
  badge,
  children,
  title,
}: {
  badge?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const contentId = React.useId();

  return (
    <section className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
      <div className="flex flex-wrap items-center justify-between gap-grid-xs">
        <h2 className="m-0 min-w-0">
          <Button
            aria-controls={contentId}
            aria-expanded={open}
            className="justify-start text-left"
            onClick={() => setOpen((value) => !value)}
            paddingX="none"
            size="sm"
            textSize="sm"
            variant="ghost"
          >
            {open ? (
              <ChevronDown aria-hidden="true" className="size-5 shrink-0" />
            ) : (
              <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
            )}
            <span className="font-heading text-xl font-bold text-brand-content">
              {title}
            </span>
          </Button>
        </h2>
        {badge}
      </div>
      <div className="grid gap-grid-xs" hidden={!open} id={contentId}>
        {children}
      </div>
    </section>
  );
}

function FulfillmentActionsPanel({
  busyTarget,
  message,
  onUpdate,
  order,
}: {
  busyTarget: AdminFulfillmentStatus | null;
  message: FulfillmentActionMessage | null;
  onUpdate?: (targetStatus: AdminFulfillmentStatus) => void;
  order: AdminOrderDetail;
}) {
  const actions = fulfillmentActionRows(order);
  const blockedReason = fulfillmentBlockedReason(order);

  return (
    <section className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
      <div className="flex flex-wrap items-center justify-between gap-grid-xs">
        <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
          Fulfillment actions
        </h2>
        <StatusBadge
          label={order.fulfillment.label}
          tone={statusTone(order.fulfillment.value)}
        />
      </div>

      {message ? (
        <p
          className={`m-0 border p-grid-xs text-sm ${
            message.tone === "success"
              ? "border-brand-success text-brand-success"
              : message.tone === "warning"
                ? "border-brand-danger text-brand-danger"
                : "border-brand-border-strong text-brand-muted"
          }`}
          role={message.tone === "warning" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}

      {actions.length > 0 ? (
        <div
          className="grid gap-grid-xs"
          role="group"
          aria-label="Fulfillment next actions"
        >
          {actions.map((action) => (
            <Button
              fullWidth
              key={action.targetStatus}
              loading={busyTarget === action.targetStatus}
              loadingLabel="Updating"
              onClick={() => onUpdate?.(action.targetStatus)}
              size="sm"
              textSize="xs"
              variant={action.variant}
            >
              {action.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="m-0 text-sm text-brand-muted">{blockedReason}</p>
      )}
    </section>
  );
}

function ReturnActionsPanel({
  busy,
  message,
  onRecord,
  order,
}: {
  busy: boolean;
  message: ReturnActionMessage | null;
  onRecord?: (body: AdminReturnRecordRequest) => Promise<void> | void;
  order: AdminOrderDetail;
}) {
  const blockedReason = returnBlockedReason(order);
  const orderLevelReturnExists = order.returnHistory.some(
    (record) => record.targetType === "ORDER"
  );
  const unavailableItemIds = returnedItemIds(order);
  const availableItems = order.items.filter(
    (item) => !unavailableItemIds.has(item.snapshotId)
  );
  const hasExistingItemReturn =
    order.returnHistory.some((record) => record.targetType === "ITEM") &&
    !orderLevelReturnExists;
  const canCreateItemReturn =
    !orderLevelReturnExists && availableItems.length > 0;
  const [targetType, setTargetType] = useState<"item" | "order">("order");
  const [itemId, setItemId] = useState(availableItems[0]?.snapshotId ?? "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [localMessage, setLocalMessage] = useState<ReturnActionMessage | null>(
    null
  );
  const effectiveTargetType = hasExistingItemReturn ? "item" : targetType;

  useEffect(() => {
    setItemId(availableItems[0]?.snapshotId ?? "");
    if (hasExistingItemReturn) {
      setTargetType("item");
    }
  }, [
    availableItems.map((item) => item.snapshotId).join("|"),
    hasExistingItemReturn,
  ]);

  async function submitReturn(event: { preventDefault(): void }) {
    event.preventDefault();

    const trimmedReason = reason.trim();

    if (!trimmedReason) {
      setLocalMessage({
        text: "Reason is required.",
        tone: "warning",
      });
      return;
    }

    if (effectiveTargetType === "item" && !itemId) {
      setLocalMessage({
        text: "Choose an item before saving.",
        tone: "warning",
      });
      return;
    }

    setLocalMessage(null);

    await onRecord?.({
      notes: notes.trim() || undefined,
      orderSnapshotId: effectiveTargetType === "item" ? itemId : undefined,
      reason: trimmedReason,
      referenceId: referenceId.trim() || undefined,
      targetStatus: "RETURN_REQUESTED",
      targetType:
        effectiveTargetType === "item"
          ? ("ITEM" satisfies AdminReturnTargetType)
          : ("ORDER" satisfies AdminReturnTargetType),
    });
  }

  const activeMessage = message ?? localMessage;

  return (
    <CollapsibleAdminPanel
      badge={
        <StatusBadge
          label={order.return.label}
          tone={statusTone(order.return.value)}
        />
      }
      title="Return actions"
    >
      {activeMessage ? (
        <p
          className={`m-0 border p-grid-xs text-sm ${
            activeMessage.tone === "success"
              ? "border-brand-success text-brand-success"
              : activeMessage.tone === "warning"
                ? "border-brand-danger text-brand-danger"
                : "border-brand-border-strong text-brand-muted"
          }`}
          role={activeMessage.tone === "warning" ? "alert" : "status"}
        >
          {activeMessage.text}
        </p>
      ) : null}

      {orderLevelReturnExists ? (
        <p className="m-0 text-sm text-brand-muted">
          Return request already covers whole order. Use return history actions
          below.
        </p>
      ) : blockedReason ? (
        <p className="m-0 text-sm text-brand-muted">{blockedReason}</p>
      ) : !canCreateItemReturn ? (
        <p className="m-0 text-sm text-brand-muted">
          All purchased items already have return records.
        </p>
      ) : (
        <form className="grid gap-grid-xs" onSubmit={submitReturn}>
          {hasExistingItemReturn ? (
            <p className="m-0 text-sm text-brand-muted">
              Choose another purchased item to create a separate return request.
            </p>
          ) : (
            <Select
              controlSize="sm"
              label="Target type"
              onChange={(event) =>
                setTargetType(
                  event.currentTarget.value === "item" ? "item" : "order"
                )
              }
              textSize="sm"
              value={targetType}
            >
              <option value="order">Entire order</option>
              <option value="item">Purchased item</option>
            </Select>
          )}

          <Select
            controlSize="sm"
            disabled={effectiveTargetType !== "item"}
            label="Item"
            onChange={(event) => setItemId(event.currentTarget.value)}
            textSize="sm"
            value={itemId}
          >
            {availableItems.map((item) => (
              <option key={item.snapshotId} value={item.snapshotId}>
                {item.productName} - {item.variantLabel}
              </option>
            ))}
          </Select>

          <Textarea
            label="Reason"
            onChange={(event) => setReason(event.currentTarget.value)}
            required
            rows={3}
            textSize="sm"
            value={reason}
          />

          <Textarea
            label="Notes"
            onChange={(event) => setNotes(event.currentTarget.value)}
            rows={3}
            textSize="sm"
            value={notes}
          />

          <label className="grid gap-grid-xs font-system text-[0.8125rem] font-bold text-brand-content">
            <span>Reference ID</span>
            <Input
              onChange={(event) => setReferenceId(event.currentTarget.value)}
              placeholder="Optional"
              textSize="sm"
              value={referenceId}
            />
          </label>

          <Button
            disabled={busy}
            fullWidth
            loading={busy}
            loadingLabel="Saving"
            size="sm"
            textSize="xs"
            type="submit"
            variant="primary"
          >
            Record return request
          </Button>
        </form>
      )}
    </CollapsibleAdminPanel>
  );
}

function ReturnHistoryPanel({
  busy,
  onRecord,
  order,
}: {
  busy: boolean;
  onRecord?: (body: AdminReturnRecordRequest) => Promise<void> | void;
  order: AdminOrderDetail;
}) {
  const latestTargetKeys = new Set<string>();

  async function recordNextStatus(
    record: AdminOrderDetail["returnHistory"][number],
    targetStatus: AdminReturnStatus
  ) {
    await onRecord?.({
      orderSnapshotId:
        record.targetType === "ITEM"
          ? (record.orderSnapshotId ?? undefined)
          : undefined,
      reason: `${returnStatusLabel(targetStatus)} from return history`,
      targetStatus,
      targetType: record.targetType,
    });
  }

  return (
    <CollapsibleAdminPanel title="Return history">
      {order.returnHistory.length === 0 ? (
        <p className="m-0 text-sm text-brand-muted">No return history yet.</p>
      ) : (
        <ol className="m-0 grid list-none gap-grid-xs p-0">
          {order.returnHistory.map((record) => {
            const key = returnTargetKey(record);
            const isLatestForTarget = !latestTargetKeys.has(key);
            latestTargetKeys.add(key);
            const nextStatuses = isLatestForTarget
              ? allowedNextReturnStatuses(record.status).map(
                  (status) => status as AdminReturnStatus
                )
              : [];

            return (
              <li
                className="grid gap-grid-xs border border-brand-border p-grid-xs"
                key={record.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-grid-xs">
                  <StatusBadge
                    label={record.statusLabel}
                    tone={statusTone(record.status)}
                  />
                  <span className="font-system text-xs text-brand-muted">
                    {formatDateTime(record.createdAt)}
                  </span>
                </div>
                <p className="m-0 font-heading text-sm font-bold text-brand-content">
                  {record.targetLabel}
                </p>
                <p className="m-0 text-sm text-brand-muted">{record.reason}</p>
                {record.notes ? (
                  <p className="m-0 text-sm text-brand-muted">
                    Notes {record.notes}
                  </p>
                ) : null}
                {record.referenceId ? (
                  <p className="m-0 text-sm text-brand-muted">
                    Reference {record.referenceId}
                  </p>
                ) : null}
                <p className="m-0 font-system text-xs text-brand-muted">
                  Recorded by {record.actorId ?? "Admin"}
                </p>
                {nextStatuses.length > 0 ? (
                  <div
                    aria-label="Return history actions"
                    className="grid gap-grid-xs pt-grid-xs md:grid-cols-2"
                    role="group"
                  >
                    {nextStatuses.map((status) => (
                      <Button
                        className={
                          status === "RETURN_CANCELLED"
                            ? "md:col-span-2"
                            : undefined
                        }
                        disabled={busy}
                        fullWidth
                        key={status}
                        loading={busy}
                        loadingLabel="Saving"
                        onClick={() => void recordNextStatus(record, status)}
                        size="sm"
                        textSize="xs"
                        variant={
                          status === "RETURN_CANCELLED" ? "danger" : "secondary"
                        }
                      >
                        {returnHistoryActionLabel[status] ??
                          returnStatusLabel(status)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </CollapsibleAdminPanel>
  );
}

function RefundActionsPanel({
  busy,
  message,
  onRecord,
  order,
}: {
  busy: boolean;
  message: RefundActionMessage | null;
  onRecord?: (body: AdminRefundRecordRequest) => Promise<void> | void;
  order: AdminOrderDetail;
}) {
  const blockedReason = refundBlockedReason(order);
  const orderLevelRefundExists = order.refundHistory.some(
    (record) => record.targetType === "ORDER"
  );
  const unavailableItemIds = refundedItemIds(order);
  const availableItems = order.items.filter(
    (item) => !unavailableItemIds.has(item.snapshotId)
  );
  const hasExistingItemRefund =
    order.refundHistory.some((record) => record.targetType === "ITEM") &&
    !orderLevelRefundExists;
  const [targetType, setTargetType] = useState<"item" | "order">("order");
  const [itemId, setItemId] = useState(availableItems[0]?.snapshotId ?? "");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const effectiveTargetType = hasExistingItemRefund ? "item" : targetType;
  const selectedItem = availableItems.find((item) => item.snapshotId === itemId);
  const defaultAmount =
    effectiveTargetType === "item"
      ? (selectedItem?.lineTotalCentavos ?? 0)
      : order.totalCentavos;
  const [amount, setAmount] = useState(
    defaultAmount > 0 ? String(defaultAmount) : ""
  );
  const [localMessage, setLocalMessage] = useState<RefundActionMessage | null>(
    null
  );
  const canCreateRefund =
    !orderLevelRefundExists &&
    (effectiveTargetType === "order" || availableItems.length > 0);

  useEffect(() => {
    setItemId(availableItems[0]?.snapshotId ?? "");
    if (hasExistingItemRefund) {
      setTargetType("item");
    }
  }, [
    availableItems.map((item) => item.snapshotId).join("|"),
    hasExistingItemRefund,
  ]);

  useEffect(() => {
    setAmount(defaultAmount > 0 ? String(defaultAmount) : "");
  }, [defaultAmount]);

  async function submitRefund(event: { preventDefault(): void }) {
    event.preventDefault();

    const trimmedReason = reason.trim();
    const amountCentavos = Number(amount.trim());

    if (!Number.isSafeInteger(amountCentavos) || amountCentavos <= 0) {
      setLocalMessage({
        text: "Refund amount is required.",
        tone: "warning",
      });
      return;
    }

    if (amountCentavos > defaultAmount) {
      setLocalMessage({
        text: `Refund amount cannot exceed ${formatCatalogPrice(defaultAmount)}.`,
        tone: "warning",
      });
      return;
    }

    if (!trimmedReason) {
      setLocalMessage({
        text: "Reason is required.",
        tone: "warning",
      });
      return;
    }

    if (effectiveTargetType === "item" && !itemId) {
      setLocalMessage({
        text: "Choose an item before saving.",
        tone: "warning",
      });
      return;
    }

    setLocalMessage(null);

    await onRecord?.({
      amountCentavos,
      notes: notes.trim() || undefined,
      orderSnapshotId: effectiveTargetType === "item" ? itemId : undefined,
      reason: trimmedReason,
      referenceId: referenceId.trim() || undefined,
      targetStatus: "REFUND_PENDING",
      targetType:
        effectiveTargetType === "item"
          ? ("ITEM" satisfies AdminRefundTargetType)
          : ("ORDER" satisfies AdminRefundTargetType),
    });
  }

  const activeMessage = message ?? localMessage;

  return (
    <CollapsibleAdminPanel
      badge={
        <StatusBadge
          label={order.refund.label}
          tone={statusTone(order.refund.value)}
        />
      }
      title="Refund actions"
    >
      {activeMessage ? (
        <p
          className={`m-0 border p-grid-xs text-sm ${
            activeMessage.tone === "success"
              ? "border-brand-success text-brand-success"
              : activeMessage.tone === "warning"
                ? "border-brand-danger text-brand-danger"
                : "border-brand-border-strong text-brand-muted"
          }`}
          role={activeMessage.tone === "warning" ? "alert" : "status"}
        >
          {activeMessage.text}
        </p>
      ) : null}

      {orderLevelRefundExists ? (
        <p className="m-0 text-sm text-brand-muted">
          Refund record already covers whole order. Use refund history actions
          below.
        </p>
      ) : blockedReason ? (
        <p className="m-0 text-sm text-brand-muted">{blockedReason}</p>
      ) : !canCreateRefund ? (
        <p className="m-0 text-sm text-brand-muted">
          All purchased items already have refund records.
        </p>
      ) : (
        <form className="grid gap-grid-xs" onSubmit={submitRefund}>
          {hasExistingItemRefund ? (
            <p className="m-0 text-sm text-brand-muted">
              Choose another purchased item to create a separate refund record.
            </p>
          ) : (
            <Select
              controlSize="sm"
              label="Target type"
              onChange={(event) =>
                setTargetType(
                  event.currentTarget.value === "item" ? "item" : "order"
                )
              }
              textSize="sm"
              value={targetType}
            >
              <option value="order">Entire order</option>
              <option value="item">Purchased item</option>
            </Select>
          )}

          <Select
            controlSize="sm"
            disabled={effectiveTargetType !== "item"}
            label="Item"
            onChange={(event) => setItemId(event.currentTarget.value)}
            textSize="sm"
            value={itemId}
          >
            {availableItems.map((item) => (
              <option key={item.snapshotId} value={item.snapshotId}>
                {item.productName} - {item.variantLabel}
              </option>
            ))}
          </Select>

          <label className="grid gap-grid-xs font-system text-[0.8125rem] font-bold text-brand-content">
            <span>Refund amount (centavos)</span>
            <Input
              min={1}
              onChange={(event) => setAmount(event.currentTarget.value)}
              required
              textSize="sm"
              type="number"
              value={amount}
            />
          </label>

          <Textarea
            label="Reason"
            onChange={(event) => setReason(event.currentTarget.value)}
            required
            rows={3}
            textSize="sm"
            value={reason}
          />

          <Textarea
            label="Notes"
            onChange={(event) => setNotes(event.currentTarget.value)}
            rows={3}
            textSize="sm"
            value={notes}
          />

          <label className="grid gap-grid-xs font-system text-[0.8125rem] font-bold text-brand-content">
            <span>Reference ID</span>
            <Input
              onChange={(event) => setReferenceId(event.currentTarget.value)}
              placeholder="Optional"
              textSize="sm"
              value={referenceId}
            />
          </label>

          <Button
            disabled={busy}
            fullWidth
            loading={busy}
            loadingLabel="Saving"
            size="sm"
            textSize="xs"
            type="submit"
            variant="primary"
          >
            Record refund
          </Button>
        </form>
      )}
    </CollapsibleAdminPanel>
  );
}

function RefundHistoryPanel({
  busy,
  onRecord,
  order,
}: {
  busy: boolean;
  onRecord?: (body: AdminRefundRecordRequest) => Promise<void> | void;
  order: AdminOrderDetail;
}) {
  const latestTargetKeys = new Set<string>();
  const [referenceByRecordId, setReferenceByRecordId] = useState<
    Record<string, string>
  >({});
  const [localMessage, setLocalMessage] = useState<RefundActionMessage | null>(
    null
  );

  async function recordNextStatus(
    record: AdminOrderDetail["refundHistory"][number],
    targetStatus: AdminRefundStatus
  ) {
    const referenceId =
      record.referenceId ?? referenceByRecordId[record.id]?.trim() ?? "";

    if (targetStatus === "REFUND_SENT" && !referenceId) {
      setLocalMessage({
        text: "Reference ID is required before marking refund sent.",
        tone: "warning",
      });
      return;
    }

    setLocalMessage(null);

    await onRecord?.({
      amountCentavos: record.amountCentavos,
      orderSnapshotId:
        record.targetType === "ITEM"
          ? (record.orderSnapshotId ?? undefined)
          : undefined,
      reason: `${refundStatusLabel(targetStatus)} from refund history`,
      referenceId: referenceId || undefined,
      targetStatus,
      targetType: record.targetType,
    });
  }

  return (
    <CollapsibleAdminPanel title="Refund history">
      {localMessage ? (
        <p
          className="m-0 border border-brand-danger p-grid-xs text-sm text-brand-danger"
          role="alert"
        >
          {localMessage.text}
        </p>
      ) : null}

      {order.refundHistory.length === 0 ? (
        <p className="m-0 text-sm text-brand-muted">No refund history yet.</p>
      ) : (
        <ol className="m-0 grid list-none gap-grid-xs p-0">
          {order.refundHistory.map((record) => {
            const key = refundTargetKey(record);
            const isLatestForTarget = !latestTargetKeys.has(key);
            latestTargetKeys.add(key);
            const nextStatuses = isLatestForTarget
              ? allowedNextRefundStatuses(record.status).map(
                  (status) => status as AdminRefundStatus
                )
              : [];
            const needsSentReference =
              nextStatuses.includes("REFUND_SENT") && !record.referenceId;

            return (
              <li
                className="grid gap-grid-xs border border-brand-border p-grid-xs"
                key={record.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-grid-xs">
                  <StatusBadge
                    label={record.statusLabel}
                    tone={statusTone(record.status)}
                  />
                  <span className="font-system text-xs text-brand-muted">
                    {formatDateTime(record.createdAt)}
                  </span>
                </div>
                <p className="m-0 font-heading text-sm font-bold text-brand-content">
                  {record.targetLabel}
                </p>
                <p className="m-0 text-sm text-brand-muted">{record.reason}</p>
                <p className="m-0 text-sm text-brand-muted">
                  Amount {formatCatalogPrice(record.amountCentavos)}
                </p>
                {record.notes ? (
                  <p className="m-0 text-sm text-brand-muted">
                    Notes {record.notes}
                  </p>
                ) : null}
                {record.referenceId ? (
                  <p className="m-0 text-sm text-brand-muted">
                    Reference {record.referenceId}
                  </p>
                ) : null}
                <p className="m-0 font-system text-xs text-brand-muted">
                  Recorded by {record.actorId ?? "Admin"}
                </p>

                {needsSentReference ? (
                  <label className="grid gap-grid-xs font-system text-[0.8125rem] font-bold text-brand-content">
                    <span>Reference ID</span>
                    <Input
                      onChange={(event) =>
                        setReferenceByRecordId((values) => ({
                          ...values,
                          [record.id]: event.currentTarget.value,
                        }))
                      }
                      placeholder="Required for sent refund"
                      textSize="sm"
                      value={referenceByRecordId[record.id] ?? ""}
                    />
                  </label>
                ) : null}

                {isLatestForTarget && nextStatuses.length === 0 ? (
                  <p className="m-0 text-sm text-brand-muted">
                    {refundStatusLabel(record.status)} is final.
                  </p>
                ) : nextStatuses.length > 0 ? (
                  <div
                    aria-label="Refund history actions"
                    className="grid gap-grid-xs pt-grid-xs md:grid-cols-2"
                    role="group"
                  >
                    {nextStatuses.map((status) => (
                      <Button
                        disabled={busy}
                        fullWidth
                        key={status}
                        loading={busy}
                        loadingLabel="Saving"
                        onClick={() => void recordNextStatus(record, status)}
                        size="sm"
                        textSize="xs"
                        variant={refundActionVariant(status)}
                      >
                        {refundHistoryActionLabel[status] ??
                          refundStatusLabel(status)}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </CollapsibleAdminPanel>
  );
}

export function AdminOrderDetailView({
  busyTarget = null,
  fulfillmentMessage = null,
  onRecordRefund,
  onUpdateFulfillment,
  onRecordReturn,
  order,
  refundBusy = false,
  refundMessage = null,
  returnBusy = false,
  returnMessage = null,
}: {
  busyTarget?: AdminFulfillmentStatus | null;
  fulfillmentMessage?: FulfillmentActionMessage | null;
  onRecordRefund?: (body: AdminRefundRecordRequest) => Promise<void> | void;
  onRecordReturn?: (body: AdminReturnRecordRequest) => Promise<void> | void;
  onUpdateFulfillment?: (targetStatus: AdminFulfillmentStatus) => void;
  order: AdminOrderDetail;
  refundBusy?: boolean;
  refundMessage?: RefundActionMessage | null;
  returnBusy?: boolean;
  returnMessage?: ReturnActionMessage | null;
}) {
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
            Order details
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
        className="order-2 grid gap-grid-sm md:grid-cols-4"
      >
        <dl className="m-0 grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <dt className="font-system text-xs font-bold uppercase text-brand-muted">
            Customer
          </dt>
          <dd className="m-0 font-heading text-xl font-bold">
            {order.customerLabel}
          </dd>
          <dd className="m-0 text-sm text-brand-muted">
            {customerKindLabel(order.customerKind)} /{" "}
            {order.checkoutEmailMasked ?? "No email"}
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

      <section
        aria-label="Order status lanes"
        className="order-3 grid gap-grid-sm"
      >
        <div className="grid gap-1">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Separate lanes
          </p>
          <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
            Status overview
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
        className="order-4 grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm"
      >
        <div className="grid gap-1">
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            Newest updates
          </p>
          <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
            Order timeline
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

      <section className="order-1 grid gap-grid-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)] lg:items-start">
        <section className="grid content-start gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
          <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
            Items purchased
          </h2>
          <ul className="m-0 grid list-none gap-0 border-t border-l border-brand-border p-0">
            {order.items.map((item, index) => {
              const imageSrc = productImageSrc(item.imageR2Key);

              return (
                <li
                  className="grid gap-grid-sm border-r border-b border-brand-border p-grid-sm md:grid-cols-[72px_minmax(0,1fr)_auto]"
                  key={`${item.productName}-${item.variantLabel}-${index}`}
                >
                  {imageSrc ? (
                    <img
                      alt={item.productName}
                      className="size-[72px] border border-brand-border bg-brand-background object-cover"
                      height="72"
                      src={imageSrc}
                      title={item.imageR2Key ?? undefined}
                      width="72"
                    />
                  ) : (
                    <div className="grid min-h-[72px] place-items-center border border-brand-border bg-brand-background font-system text-[0.65rem] font-bold uppercase text-brand-muted">
                      No image
                    </div>
                  )}
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
              );
            })}
          </ul>
        </section>

        <aside className="grid content-start gap-grid-sm">
          <FulfillmentActionsPanel
            busyTarget={busyTarget}
            message={fulfillmentMessage}
            onUpdate={onUpdateFulfillment}
            order={order}
          />

          <ReturnActionsPanel
            busy={returnBusy}
            message={returnMessage}
            onRecord={onRecordReturn}
            order={order}
          />

          <ReturnHistoryPanel
            busy={returnBusy}
            onRecord={onRecordReturn}
            order={order}
          />

          <RefundActionsPanel
            busy={refundBusy}
            message={refundMessage}
            onRecord={onRecordRefund}
            order={order}
          />

          <RefundHistoryPanel
            busy={refundBusy}
            onRecord={onRecordRefund}
            order={order}
          />

          <section className="grid gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm">
            <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
              Customer contact
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
  const [busyTarget, setBusyTarget] = useState<AdminFulfillmentStatus | null>(
    null
  );
  const [fulfillmentMessage, setFulfillmentMessage] =
    useState<FulfillmentActionMessage | null>(null);
  const [returnBusy, setReturnBusy] = useState(false);
  const [returnMessage, setReturnMessage] =
    useState<ReturnActionMessage | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundMessage, setRefundMessage] =
    useState<RefundActionMessage | null>(null);

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

  async function handleFulfillmentUpdate(targetStatus: AdminFulfillmentStatus) {
    if (!order || busyTarget) {
      return;
    }

    setBusyTarget(targetStatus);
    setFulfillmentMessage(null);

    try {
      const result = await updateAdminOrderFulfillment(
        order.orderId,
        targetStatus
      );
      setOrder(result.order);
      setFulfillmentMessage({
        text: fulfillmentEmailMessage(result.email.status),
        tone: result.email.status === "FAILED" ? "warning" : "success",
      });
    } catch (error) {
      const failure = error as AdminOrderApiFailure;

      if (failure.status === 409 && autoLoad) {
        try {
          setOrder(await fetchAdminOrderDetail(orderId));
        } catch {
          // Refresh is best-effort after stale state.
        }
      }

      setFulfillmentMessage({
        text:
          failure.code === "CONFLICT_STATE"
            ? "Order changed. Review latest status before trying again."
            : "Fulfillment update failed.",
        tone: "warning",
      });
    } finally {
      setBusyTarget(null);
    }
  }

  async function handleReturnRecord(body: AdminReturnRecordRequest) {
    if (!order || returnBusy) {
      return;
    }

    setReturnBusy(true);
    setReturnMessage(null);

    try {
      const result = await recordAdminOrderReturn(order.orderId, body);
      setOrder(result.order);
      setReturnMessage({
        text: "Return record saved.",
        tone: "success",
      });
    } catch (error) {
      const failure = error as AdminOrderApiFailure;

      if (failure.status === 409 && autoLoad) {
        try {
          setOrder(await fetchAdminOrderDetail(orderId));
        } catch {
          // Refresh is best-effort after stale state.
        }
      }

      setReturnMessage({
        text:
          failure.code === "CONFLICT_STATE"
            ? "Return status changed. Review latest status before saving again."
            : "Return record failed.",
        tone: "warning",
      });
    } finally {
      setReturnBusy(false);
    }
  }

  async function handleRefundRecord(body: AdminRefundRecordRequest) {
    if (!order || refundBusy) {
      return;
    }

    setRefundBusy(true);
    setRefundMessage(null);

    try {
      const result = await recordAdminOrderRefund(order.orderId, body);
      setOrder(result.order);
      setRefundMessage({
        text: "Refund record saved.",
        tone: "success",
      });
    } catch (error) {
      const failure = error as AdminOrderApiFailure;

      if (failure.status === 409 && autoLoad) {
        try {
          setOrder(await fetchAdminOrderDetail(orderId));
        } catch {
          // Refresh is best-effort after stale state.
        }
      }

      setRefundMessage({
        text:
          failure.code === "CONFLICT_STATE"
            ? "Refund status changed. Review latest status before saving again."
            : "Refund record failed.",
        tone: "warning",
      });
    } finally {
      setRefundBusy(false);
    }
  }

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
        <AdminOrderDetailView
          busyTarget={busyTarget}
          fulfillmentMessage={fulfillmentMessage}
          onRecordRefund={handleRefundRecord}
          onRecordReturn={handleReturnRecord}
          onUpdateFulfillment={handleFulfillmentUpdate}
          order={order}
          refundBusy={refundBusy}
          refundMessage={refundMessage}
          returnBusy={returnBusy}
          returnMessage={returnMessage}
        />
      ) : null}
    </section>
  );
}
