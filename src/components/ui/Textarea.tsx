import * as React from "react";
import { useId, type TextareaHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

export type TextareaBorderTone = "subtle" | "strong";
export type TextareaTextSize = "xs" | "sm" | "md" | "lg";

const fieldClass = "grid min-w-0 gap-grid-xs";
const labelClass = "font-system text-[0.8125rem] font-bold text-brand-content";
const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";

const controlBaseClass =
  "min-h-24 w-full resize-y rounded-none border bg-brand-surface px-grid-xs py-grid-xs text-brand-content shadow-none filter-none aria-[invalid=true]:border-brand-danger";

const controlInteractiveClass =
  "hover:outline-2 hover:outline-offset-2 hover:outline-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent";

const controlBorderToneClass: Record<TextareaBorderTone, string> = {
  subtle: "border-brand-border",
  strong: "border-brand-border-strong",
};

const controlTextSizeClass: Record<TextareaTextSize, string> = {
  xs: "text-xs",
  sm: "text-[0.8125rem]",
  md: "text-base",
  lg: "text-lg",
};

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  borderTone?: TextareaBorderTone;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  interactive?: boolean;
  label: string;
  textareaClassName?: string;
  textSize?: TextareaTextSize;
};

export function Textarea({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  borderTone = "strong",
  className,
  description,
  error,
  hideLabel = false,
  id,
  interactive = true,
  label,
  required,
  textareaClassName,
  textSize = "md",
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const descriptionId = description ? `${textareaId}-description` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <div className={mergeClassNames(fieldClass, className)}>
      <label
        className={mergeClassNames(labelClass, hideLabel && "sr-only")}
        htmlFor={textareaId}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      {description ? (
        <p className={descriptionClass} id={descriptionId}>
          {description}
        </p>
      ) : null}

      <textarea
        {...props}
        aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
        aria-invalid={error ? true : ariaInvalid}
        className={mergeClassNames(
          controlBaseClass,
          interactive && controlInteractiveClass,
          controlBorderToneClass[borderTone],
          controlTextSizeClass[textSize],
          textareaClassName
        )}
        id={textareaId}
        required={required}
      />

      {error ? (
        <p className={errorClass} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
