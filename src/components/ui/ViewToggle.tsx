import * as React from "react";
import type { HTMLAttributes } from "react";

import { SegmentedControl } from "./SegmentedControl";

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
    <SegmentedControl
      {...props}
      className={className}
      label={label}
      onChange={onChange}
      options={options}
      value={value}
    />
  );
}
