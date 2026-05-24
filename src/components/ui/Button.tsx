import * as React from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const buttonBaseClass =
  "inline-flex min-h-control-md items-center justify-center gap-grid-xs rounded-none border px-grid-sm font-system font-bold leading-none no-underline shadow-none whitespace-nowrap filter-none enabled:hover:outline-2 enabled:hover:outline-offset-2 enabled:hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent aria-busy:border-dashed";

const buttonSizeClass: Record<ButtonSize, string> = {
  sm: "min-h-control-sm px-grid-xs text-[0.8125rem]",
  md: "min-h-control-md px-grid-sm",
};

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: "border-brand-accent bg-brand-accent text-brand-surface",
  secondary: "border-brand-border-strong bg-brand-surface text-brand-content",
  danger: "border-brand-danger bg-brand-danger text-brand-surface",
  ghost: "border-transparent bg-transparent text-brand-content",
};

export function Button({
  children,
  className,
  disabled,
  fullWidth = false,
  loading = false,
  loadingLabel = "Loading",
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={mergeClassNames(
        buttonBaseClass,
        buttonSizeClass[size],
        buttonVariantClass[variant],
        fullWidth && "w-full",
        className,
      )}
      data-loading={loading ? "true" : undefined}
      disabled={isDisabled}
      type={type}
    >
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}
