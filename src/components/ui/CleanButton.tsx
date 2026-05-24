import * as React from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import { mergeClassNames } from "../utils";
import type { ButtonSize } from "./Button";

export type CleanButtonVariant = "neutral" | "primary" | "danger";

type CleanButtonSharedProps = {
  active?: boolean;
  children?: ReactNode;
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: CleanButtonVariant;
};

export type CleanButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  CleanButtonSharedProps & {
    loading?: boolean;
    loadingLabel?: string;
  };

export type CleanLinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  CleanButtonSharedProps;

const cleanBaseClass =
  "inline-flex min-h-control-md items-center justify-center gap-grid-xs rounded-none border border-transparent px-grid-sm font-system font-bold leading-none no-underline shadow-none whitespace-nowrap filter-none hover:bg-brand-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent aria-busy:opacity-70";

const cleanSizeClass: Record<ButtonSize, string> = {
  sm: "min-h-control-sm px-grid-xs text-[0.8125rem]",
  md: "min-h-control-md px-grid-sm",
};

const cleanVariantClass: Record<CleanButtonVariant, string> = {
  neutral: "text-brand-content",
  primary: "bg-brand-accent text-brand-surface hover:bg-brand-accent",
  danger: "text-brand-danger hover:bg-[color-mix(in_srgb,var(--color-brand-danger)_10%,transparent)]",
};

const cleanActiveClass =
  "bg-brand-content text-brand-surface hover:bg-brand-content";

function cleanClassName(input: {
  active?: boolean;
  className?: string;
  fullWidth?: boolean;
  size: ButtonSize;
  variant: CleanButtonVariant;
}) {
  return mergeClassNames(
    cleanBaseClass,
    cleanSizeClass[input.size],
    input.active ? cleanActiveClass : cleanVariantClass[input.variant],
    input.fullWidth && "w-full",
    input.className
  );
}

export function CleanButton({
  active = false,
  children,
  className,
  disabled,
  fullWidth = false,
  loading = false,
  loadingLabel = "Loading",
  size = "md",
  type = "button",
  variant = "neutral",
  ...props
}: CleanButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={cleanClassName({
        active,
        className,
        fullWidth,
        size,
        variant,
      })}
      data-loading={loading ? "true" : undefined}
      disabled={isDisabled}
      type={type}
    >
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}

export function CleanLinkButton({
  active = false,
  children,
  className,
  fullWidth = false,
  size = "md",
  variant = "neutral",
  ...props
}: CleanLinkButtonProps) {
  return (
    <a
      {...props}
      className={cleanClassName({
        active,
        className,
        fullWidth,
        size,
        variant,
      })}
    >
      {children}
    </a>
  );
}
