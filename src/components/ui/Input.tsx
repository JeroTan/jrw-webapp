import * as React from "react";
import type { InputHTMLAttributes } from "react";

import { mergeClassNames } from "../utils";

export type InputBorderTone = "subtle" | "strong";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  borderTone?: InputBorderTone;
  inputClassName?: string;
};

const inputBaseClass =
  "min-h-control-md w-full rounded-none border bg-brand-surface px-grid-xs text-brand-content shadow-none filter-none hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent aria-[invalid=true]:border-brand-danger";

const inputBorderToneClass: Record<InputBorderTone, string> = {
  subtle: "border-brand-border",
  strong: "border-brand-border-strong",
};

export function Input({
  borderTone = "strong",
  className,
  inputClassName,
  type,
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      className={mergeClassNames(
        inputBaseClass,
        inputBorderToneClass[borderTone],
        inputClassName,
        className,
        type && type == "number"
          ? "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          : ""
      )}
    />
  );
}
