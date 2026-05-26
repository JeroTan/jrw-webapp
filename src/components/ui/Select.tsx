import * as React from "react";
import { useId, type SelectHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

export type SelectControlSize = "sm" | "md";
export type SelectTextSize = "xs" | "sm" | "md" | "lg";
export type SelectBorderTone = "subtle" | "strong";

const fieldClass = "grid min-w-0 gap-grid-xs";
const labelClass = "font-system text-[0.8125rem] font-bold text-brand-content";
const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";

const controlBaseClass =
  "w-full rounded-none border bg-brand-surface px-grid-xs text-brand-content shadow-none filter-none hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent aria-[invalid=true]:border-brand-danger";

const controlSizeClass: Record<SelectControlSize, string> = {
  sm: "min-h-control-sm",
  md: "min-h-control-md",
};

const controlTextSizeClass: Record<SelectTextSize, string> = {
  xs: "text-xs",
  sm: "text-[0.8125rem]",
  md: "text-base",
  lg: "text-lg",
};

const controlBorderToneClass: Record<SelectBorderTone, string> = {
  subtle: "border-brand-border",
  strong: "border-brand-border-strong",
};

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  borderTone?: SelectBorderTone;
  controlSize?: SelectControlSize;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  label: string;
  selectClassName?: string;
  textSize?: SelectTextSize;
};

export function Select({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  borderTone = "strong",
  children,
  className,
  controlSize = "md",
  description,
  error,
  hideLabel = false,
  id,
  label,
  required,
  selectClassName,
  textSize = "md",
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = description ? `${selectId}-description` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={mergeClassNames(fieldClass, className)}>
      <label
        className={mergeClassNames(labelClass, hideLabel && "sr-only")}
        htmlFor={selectId}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      {description ? (
        <p className={descriptionClass} id={descriptionId}>
          {description}
        </p>
      ) : null}

      <select
        {...props}
        aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
        aria-invalid={error ? true : ariaInvalid}
        className={mergeClassNames(
          controlBaseClass,
          controlSizeClass[controlSize],
          controlTextSizeClass[textSize],
          controlBorderToneClass[borderTone],
          selectClassName
        )}
        id={selectId}
        required={required}
      >
        {children}
      </select>

      {error ? (
        <p className={errorClass} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
