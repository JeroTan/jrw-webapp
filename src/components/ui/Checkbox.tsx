import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

const fieldClass = "grid min-w-0 gap-grid-xs";
const checkboxClass =
  "inline-grid grid-cols-[auto_1fr] items-start gap-grid-xs text-brand-content has-[:disabled]:cursor-not-allowed has-[:disabled]:text-brand-disabled has-[:disabled]:opacity-70";
const inputClass = "peer absolute opacity-0";
const boxClass =
  "mt-0.5 grid size-5 place-items-center rounded-none border border-brand-border-strong bg-brand-surface text-brand-surface peer-checked:bg-brand-accent peer-disabled:border-brand-disabled peer-disabled:bg-brand-border peer-disabled:text-brand-disabled peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-accent";
const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  description?: string;
  error?: string;
  label: string;
};

export function Checkbox({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  description,
  error,
  id,
  label,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = description ? `${checkboxId}-description` : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;

  return (
    <div className={mergeClassNames(fieldClass, className)}>
      <label className={checkboxClass} htmlFor={checkboxId}>
        <input
          {...props}
          aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
          aria-invalid={error ? true : ariaInvalid}
          className={inputClass}
          id={checkboxId}
          type="checkbox"
        />
        <span className={boxClass} aria-hidden="true">
          ✓
        </span>
        <span>{label}</span>
      </label>
      {description ? (
        <p className={descriptionClass} id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className={errorClass} id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
