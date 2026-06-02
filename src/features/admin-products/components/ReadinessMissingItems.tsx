import * as React from "react";

export type ReadinessMissingItemsProps = {
  items: string[];
};

export function ReadinessMissingItems({ items }: ReadinessMissingItemsProps) {
  return (
    <section
      className="grid gap-grid-xs border border-brand-border bg-brand-surface p-grid-sm font-system text-[0.8125rem] font-bold [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-grid-sm"
      role="status"
    >
      <p>Missing requirements:</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
