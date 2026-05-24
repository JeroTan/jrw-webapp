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

const iconButtonBaseClass =
  "inline-flex size-control-md items-center justify-center gap-grid-xs rounded-none border p-0 font-system font-bold leading-none no-underline shadow-none whitespace-nowrap filter-none enabled:hover:outline-2 enabled:hover:outline-offset-2 enabled:hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent aria-busy:border-dashed";

const iconButtonSizeClass: Record<ButtonSize, string> = {
  sm: "size-control-sm text-[0.8125rem]",
  md: "size-control-md",
};

const iconButtonVariantClass: Record<ButtonVariant, string> = {
  primary: "border-brand-accent bg-brand-accent text-brand-surface",
  secondary: "border-brand-border-strong bg-brand-surface text-brand-content",
  danger: "border-brand-danger bg-brand-danger text-brand-surface",
  ghost: "border-transparent bg-transparent text-brand-content",
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
        iconButtonBaseClass,
        iconButtonSizeClass[size],
        iconButtonVariantClass[variant],
        className,
      )}
      data-loading={loading ? "true" : undefined}
      disabled={isDisabled}
      title={tooltip ?? title ?? label}
      type={type}
    >
      <span aria-hidden="true">{loading ? "..." : children}</span>
    </button>
  );
}
