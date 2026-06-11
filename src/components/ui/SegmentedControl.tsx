import * as React from "react";
import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../utils";

export type SegmentedControlSize = "sm" | "md";
export type SegmentedControlTextSize = "xs" | "sm";
export type SegmentedControlBorderTone = "subtle" | "strong";

export type SegmentedControlOption<Value extends string> = {
  disabled?: boolean;
  label: string;
  value: Value;
};

export type SegmentedControlProps<Value extends string> = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> & {
  borderTone?: SegmentedControlBorderTone;
  label: string;
  onChange: (value: Value) => void;
  options: Array<SegmentedControlOption<Value>>;
  size?: SegmentedControlSize;
  textSize?: SegmentedControlTextSize;
  value: Value;
};

const segmentedControlClass =
  "inline-grid max-w-full grid-flow-col border bg-brand-surface max-md:w-full";
const segmentedControlSizeClass: Record<SegmentedControlSize, string> = {
  sm: "min-h-control-sm",
  md: "min-h-control-md",
};
const segmentedControlTextClass: Record<SegmentedControlTextSize, string> = {
  xs: "text-xs",
  sm: "text-[0.8125rem]",
};
const segmentedControlBorderClass: Record<SegmentedControlBorderTone, string> =
  {
    subtle: "border-brand-border",
    strong: "border-brand-border-strong",
  };
const segmentedControlOptionClass =
  "min-w-[88px] max-w-full border-0 border-r px-grid-xs font-system font-bold uppercase last:border-r-0 enabled:hover:outline-2 enabled:hover:outline-offset-2 enabled:hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent disabled:cursor-not-allowed disabled:opacity-50 max-md:min-w-0 [overflow-wrap:anywhere]";
const segmentedControlOptionIdleClass = "bg-brand-surface text-brand-content";
const segmentedControlOptionSelectedClass =
  "bg-brand-content text-brand-surface";

export function SegmentedControl<Value extends string>({
  borderTone = "strong",
  className,
  label,
  onChange,
  options,
  size = "md",
  textSize = "xs",
  value,
  ...props
}: SegmentedControlProps<Value>) {
  const borderClass = segmentedControlBorderClass[borderTone];

  return (
    <div
      {...props}
      aria-label={label}
      className={mergeClassNames(
        segmentedControlClass,
        borderClass,
        segmentedControlSizeClass[size],
        className
      )}
      role="group"
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            aria-pressed={selected}
            className={mergeClassNames(
              segmentedControlOptionClass,
              segmentedControlSizeClass[size],
              segmentedControlTextClass[textSize],
              borderClass,
              selected
                ? segmentedControlOptionSelectedClass
                : segmentedControlOptionIdleClass
            )}
            data-state={selected ? "selected" : "idle"}
            disabled={option.disabled}
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
