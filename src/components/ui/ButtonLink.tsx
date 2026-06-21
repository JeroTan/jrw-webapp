import * as React from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { mergeClassNames } from "../utils";

export type ButtonLinkVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonLinkSize = "sm" | "md";
export type ButtonLinkPaddingX = "none" | "xs" | "sm" | "md" | "lg";
export type ButtonLinkTextSize = "xs" | "sm" | "md" | "lg";
export type ButtonLinkBorderTone = "subtle" | "strong";

export type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode;
  borderTone?: ButtonLinkBorderTone;
  disabled?: boolean;
  fullWidth?: boolean;
  interactive?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  paddingX?: ButtonLinkPaddingX;
  size?: ButtonLinkSize;
  square?: boolean;
  textSize?: ButtonLinkTextSize;
  variant?: ButtonLinkVariant;
};

const buttonLinkBaseClass =
  "inline-flex items-center justify-center gap-grid-xs rounded-none border font-system font-bold leading-none no-underline shadow-none whitespace-nowrap filter-none aria-busy:border-dashed aria-disabled:pointer-events-none aria-disabled:opacity-50";

const buttonLinkInteractiveClass =
  "hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus:outline-2 focus:outline-offset-2 focus:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent";

const buttonLinkSizeClass: Record<ButtonLinkSize, string> = {
  sm: "min-h-control-sm",
  md: "min-h-control-md",
};

const buttonLinkSquareSizeClass: Record<ButtonLinkSize, string> = {
  sm: "size-control-sm",
  md: "size-control-md",
};

const buttonLinkPaddingXClass: Record<ButtonLinkPaddingX, string> = {
  none: "px-0",
  xs: "px-grid-xs",
  sm: "px-grid-sm",
  md: "px-grid-md",
  lg: "px-grid-lg",
};

const buttonLinkTextSizeClass: Record<ButtonLinkTextSize, string> = {
  xs: "text-xs",
  sm: "text-[0.8125rem]",
  md: "text-base",
  lg: "text-lg",
};

const buttonLinkBorderToneClass: Record<ButtonLinkBorderTone, string> = {
  subtle: "border-brand-border",
  strong: "border-brand-border-strong",
};

const buttonLinkVariantClass: Record<
  Exclude<ButtonLinkVariant, "secondary">,
  string
> = {
  primary: "border-brand-accent bg-brand-accent text-brand-surface",
  danger: "border-brand-danger bg-brand-danger text-brand-surface",
  ghost: "border-transparent bg-transparent text-brand-content",
};

export function ButtonLink({
  children,
  borderTone = "strong",
  className,
  disabled = false,
  fullWidth = false,
  href,
  interactive = true,
  loading = false,
  loadingLabel = "Loading",
  paddingX = "sm",
  size = "md",
  square = false,
  textSize = "md",
  variant = "secondary",
  onClick,
  ...props
}: ButtonLinkProps) {
  const isDisabled = disabled || loading;

  return (
    <a
      {...props}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={mergeClassNames(
        buttonLinkBaseClass,
        interactive && buttonLinkInteractiveClass,
        square ? buttonLinkSquareSizeClass[size] : buttonLinkSizeClass[size],
        square
          ? buttonLinkPaddingXClass.none
          : buttonLinkPaddingXClass[paddingX],
        buttonLinkTextSizeClass[textSize],
        variant === "secondary"
          ? `${buttonLinkBorderToneClass[borderTone]} bg-brand-surface text-brand-content`
          : buttonLinkVariantClass[variant],
        fullWidth && !square && "w-full",
        className
      )}
      data-loading={loading ? "true" : undefined}
      href={isDisabled ? undefined : href}
      onClick={(event) => {
        if (isDisabled) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
    >
      <span className="inline-flex items-center justify-center gap-grid-xs">
        {loading ? loadingLabel : children}
      </span>
    </a>
  );
}
