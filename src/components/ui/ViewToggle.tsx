import * as React from "react";
import type { HTMLAttributes } from "react";

import { mergeClassNames } from "../utils";

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
      className={mergeClassNames("jrw-view-toggle", className)}
      role="group"
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <button
            aria-pressed={selected}
            className={mergeClassNames(
              "jrw-view-toggle__option",
              selected && "jrw-view-toggle__option--selected"
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
