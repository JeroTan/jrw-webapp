import * as React from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";
import type { ButtonSize, ButtonVariant } from "./Button";

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  children?: ReactNode;
  label: string;
  loading?: boolean;
  size?: ButtonSize;
  tooltip?: string;
  variant?: ButtonVariant;
};

export function IconButton({
  children,
  className,
  disabled,
  label,
  loading = false,
  size = "md",
  title,
  tooltip,
  type = "button",
  variant = "secondary",
  ...props
}: IconButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      aria-label={label}
      className={mergeClassNames(
        "jrw-icon-button",
        `jrw-icon-button--${variant}`,
        `jrw-icon-button--${size}`,
        className,
      )}
      data-loading={loading ? "true" : undefined}
      disabled={isDisabled}
      title={tooltip ?? title ?? label}
      type={type}
    >
      <span className="jrw-icon-button__icon" aria-hidden="true">
        {loading ? "..." : children}
      </span>
    </button>
  );
}
