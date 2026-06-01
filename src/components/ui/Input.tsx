import * as React from "react";
import type { InputHTMLAttributes } from "react";

import { mergeClassNames } from "../utils";

export type InputBorderTone = "subtle" | "strong";
export type InputTextSize = "xs" | "sm" | "md" | "lg";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  borderTone?: InputBorderTone;
  inputClassName?: string;
  textSize?: InputTextSize;
};

const inputBaseClass =
  "min-h-control-md w-full rounded-none border bg-brand-surface px-grid-xs text-brand-content shadow-none filter-none hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent aria-[invalid=true]:border-brand-danger";

const inputBorderToneClass: Record<InputBorderTone, string> = {
  subtle: "border-brand-border",
  strong: "border-brand-border-strong",
};

const inputTextSizeClass: Record<InputTextSize, string> = {
  xs: "text-xs",
  sm: "text-[0.8125rem]",
  md: "text-base",
  lg: "text-lg",
};

export function Input({
  borderTone = "strong",
  className,
  inputClassName,
  textSize = "md",
  type,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      type={type}
      className={mergeClassNames(
        inputBaseClass,
        inputBorderToneClass[borderTone],
        inputTextSizeClass[textSize],
        inputClassName,
        className,
        type === "number"
          ? "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          : ""
      )}
    />
  );
}
