import * as React from "react";
import { StatusBadge } from "@/components/feedback";
import type {
  CustomerOrderStatusLanes,
  CustomerOrderTimelineEvent,
} from "@/domain/orders/customer-order-status";

export type OrderTruthTimelineProps = {
  heading?: string;
  lanes: CustomerOrderStatusLanes;
  laneHeading?: string;
  laneSubheading?: string | null;
  laneTitles?: Partial<Record<keyof CustomerOrderStatusLanes, string>>;
  timeline: CustomerOrderTimelineEvent[];
  timelineHeading?: string;
  timelineSubheading?: string | null;
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
    return "Unavailable";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(parsed);
}

function laneTitle(
  kind: keyof CustomerOrderStatusLanes,
  titleOverrides?: Partial<Record<keyof CustomerOrderStatusLanes, string>>
): string {
  const override = titleOverrides?.[kind];

  if (override) {
    return override;
  }

  switch (kind) {
    case "payment":
      return "Payment";
    case "fulfillment":
      return "Delivery";
    case "return":
      return "Return";
    case "refund":
      return "Refund";
  }
}

export function OrderStatusLanes({
  heading = "Status overview",
  lanes,
  subheading = null,
  titles,
}: {
  heading?: string;
  lanes: CustomerOrderStatusLanes;
  subheading?: string | null;
  titles?: Partial<Record<keyof CustomerOrderStatusLanes, string>>;
}) {
  const orderedLanes = [
    ["payment", lanes.payment],
    ["fulfillment", lanes.fulfillment],
    ["return", lanes.return],
    ["refund", lanes.refund],
  ] as const;

  return (
    <section aria-label="Order status categories" className="grid gap-grid-sm">
      <div className="grid gap-1">
        {subheading ? (
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            {subheading}
          </p>
        ) : null}
        <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
          {heading}
        </h2>
      </div>
      <div className="grid gap-grid-sm sm:grid-cols-2 xl:grid-cols-4">
        {orderedLanes.map(([kind, lane]) => (
          <article
            className="grid min-h-[9rem] content-start gap-grid-xs border border-brand-border-strong bg-brand-surface p-grid-sm"
            key={kind}
          >
            <StatusBadge label={lane.label} tone={statusTone(lane.value)} />
            <h3 className="m-0 font-heading text-lg font-bold text-brand-content">
              {laneTitle(kind, titles)}
            </h3>
            <p className="m-0 font-system text-xs text-brand-muted">
              Last updated {formatDateTime(lane.updatedAt)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function OrderTimelineEvents({
  heading = "Order timeline",
  subheading = null,
  timeline,
}: {
  heading?: string;
  subheading?: string | null;
  timeline: CustomerOrderTimelineEvent[];
}) {
  return (
    <section
      aria-label="Order timeline"
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm"
    >
      <div className="grid gap-1">
        {subheading ? (
          <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
            {subheading}
          </p>
        ) : null}
        <h2 className="m-0 font-heading text-xl font-bold text-brand-content">
          {heading}
        </h2>
      </div>
      {timeline.length === 0 ? (
        <p className="m-0 text-sm text-brand-muted">No updates yet.</p>
      ) : (
        <ol className="relative m-0 grid list-none gap-0 p-0 before:absolute before:bottom-0 before:left-0 before:top-grid-sm before:border-l before:border-brand-border-strong before:content-['']">
          {timeline.map((event, index) => (
            <li
              className="relative grid gap-grid-xs border-b border-brand-border py-grid-sm pl-grid-md last:border-b-0"
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
      )}
    </section>
  );
}

export function OrderTruthTimeline({
  heading,
  lanes,
  laneHeading,
  laneSubheading,
  laneTitles,
  timeline,
  timelineHeading,
  timelineSubheading,
}: OrderTruthTimelineProps) {
  return (
    <section
      aria-label={heading ?? "Order status updates"}
      className="grid gap-grid-sm"
    >
      <OrderStatusLanes
        heading={laneHeading}
        lanes={lanes}
        subheading={laneSubheading}
        titles={laneTitles}
      />
      <OrderTimelineEvents
        heading={timelineHeading}
        subheading={timelineSubheading}
        timeline={timeline}
      />
    </section>
  );
}
