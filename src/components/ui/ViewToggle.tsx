import * as React from "react";
import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../utils";

const viewToggleClass =
  "inline-grid min-h-control-md grid-flow-col border border-brand-border-strong bg-brand-surface max-md:w-full";
const viewToggleOptionClass =
  "min-h-control-md min-w-[88px] border-0 border-r border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase last:border-r-0 hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-brand-accent focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-brand-accent max-md:min-w-0";
const viewToggleOptionIdleClass = "bg-brand-surface text-brand-content";
const viewToggleOptionSelectedClass = "bg-brand-content text-brand-surface";

export type ViewToggleOption<Value extends string> = {
  label: string;
  value: Value;
};

export type ViewToggleProps<Value extends string> = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> & {
  label: string;
  onChange: (value: Value) => void;
  options: Array<ViewToggleOption<Value>>;
  value: Value;
};

export function ViewToggle<Value extends string>({
  className,
  label,
  onChange,
  options,
  value,
  ...props
}: ViewToggleProps<Value>) {
  return (
    <div
      {...props}
      aria-label={label}
      className={mergeClassNames(viewToggleClass, className)}
      role="group"
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            aria-pressed={selected}
            className={mergeClassNames(
              viewToggleOptionClass,
              selected
                ? viewToggleOptionSelectedClass
                : viewToggleOptionIdleClass
            )}
            data-state={selected ? "selected" : "idle"}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
