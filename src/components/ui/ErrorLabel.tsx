import * as React from "react";
import type { HTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type ErrorLabelProps = HTMLAttributes<HTMLParagraphElement> & {
  children?: ReactNode;
};

const errorLabelClass = "font-system text-xs font-bold text-brand-danger";

export function ErrorLabel({ children, className, ...props }: ErrorLabelProps) {
  if (!children) {
    return null;
  }

  return (
    <p {...props} className={mergeClassNames(errorLabelClass, className)}>
      {children}
    </p>
  );
}
