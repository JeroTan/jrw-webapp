import * as React from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md";
export type ButtonPaddingX = "none" | "xs" | "sm" | "md" | "lg";
export type ButtonTextSize = "xs" | "sm" | "md" | "lg";
export type ButtonBorderTone = "subtle" | "strong";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  borderTone?: ButtonBorderTone;
  fullWidth?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  paddingX?: ButtonPaddingX;
  size?: ButtonSize;
  square?: boolean;
  textSize?: ButtonTextSize;
  variant?: ButtonVariant;
};

const buttonBaseClass =
  "inline-flex items-center justify-center gap-grid-xs rounded-none border font-system font-bold leading-none no-underline shadow-none whitespace-nowrap filter-none enabled:hover:outline-2 enabled:hover:outline-offset-2 enabled:hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent aria-busy:border-dashed";

const buttonSizeClass: Record<ButtonSize, string> = {
  sm: "min-h-control-sm",
  md: "min-h-control-md",
};

const buttonSquareSizeClass: Record<ButtonSize, string> = {
  sm: "size-control-sm",
  md: "size-control-md",
};

const buttonPaddingXClass: Record<ButtonPaddingX, string> = {
  none: "px-0",
  xs: "px-grid-xs",
  sm: "px-grid-sm",
  md: "px-grid-md",
  lg: "px-grid-lg",
};

const buttonTextSizeClass: Record<ButtonTextSize, string> = {
  xs: "text-xs",
  sm: "text-[0.8125rem]",
  md: "text-base",
  lg: "text-lg",
};

const buttonBorderToneClass: Record<ButtonBorderTone, string> = {
  subtle: "border-brand-border",
  strong: "border-brand-border-strong",
};

const buttonVariantClass: Record<
  Exclude<ButtonVariant, "secondary">,
  string
> = {
  primary: "border-brand-accent bg-brand-accent text-brand-surface",
  danger: "border-brand-danger bg-brand-danger text-brand-surface",
  ghost: "border-transparent bg-transparent text-brand-content",
};

export function Button({
  children,
  borderTone = "strong",
  className,
  disabled,
  fullWidth = false,
  loading = false,
  loadingLabel = "Loading",
  paddingX = "sm",
  size = "md",
  square = false,
  textSize = "md",
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
        square ? buttonSquareSizeClass[size] : buttonSizeClass[size],
        square ? buttonPaddingXClass.none : buttonPaddingXClass[paddingX],
        buttonTextSizeClass[textSize],
        variant === "secondary"
          ? `${buttonBorderToneClass[borderTone]} bg-brand-surface text-brand-content`
          : buttonVariantClass[variant],
        fullWidth && !square && "w-full",
        className
      )}
      data-loading={loading ? "true" : undefined}
      disabled={isDisabled}
      type={type}
    >
      <span className="inline-flex items-center justify-center gap-grid-xs">
        {loading ? loadingLabel : children}
      </span>
    </button>
  );
}
