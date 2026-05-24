import * as React from "react";
import { useId, type TextareaHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

const fieldClass = "grid min-w-0 gap-grid-xs";
const labelClass =
  "font-system text-[0.8125rem] font-bold text-brand-content";
const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";
const controlClass =
  "min-h-24 w-full resize-y rounded-none border border-brand-border-strong bg-brand-surface px-grid-xs py-grid-xs text-brand-content shadow-none filter-none aria-[invalid=true]:border-brand-danger";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  description?: string;
  error?: string;
  hideLabel?: boolean;
  label: string;
  textareaClassName?: string;
};

export function Textarea({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  description,
  error,
  hideLabel = false,
  id,
  label,
  required,
  textareaClassName,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const descriptionId = description ? `${textareaId}-description` : undefined;
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <div className={mergeClassNames(fieldClass, className)}>
      <label
        className={mergeClassNames(
          labelClass,
          hideLabel && "sr-only",
        )}
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
        className={mergeClassNames(controlClass, textareaClassName)}
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
