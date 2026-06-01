import * as React from "react";
import type { LabelHTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  children?: ReactNode;
  hideLabel?: boolean;
  required?: boolean;
};

const labelClass = "brand-title-secondary";

export function Label({
  children,
  className,
  hideLabel = false,
  required = false,
  ...props
}: LabelProps) {
  return (
    <label
      {...props}
      className={mergeClassNames(labelClass, hideLabel && "sr-only", className)}
    >
      {children}
      {required ? <span aria-hidden="true"> *</span> : null}
    </label>
  );
}
