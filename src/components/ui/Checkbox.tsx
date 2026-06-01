import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

const fieldClass = "grid min-w-0 gap-grid-xs";
const checkboxBaseClass =
  "inline-grid grid-cols-[auto_1fr] items-start text-brand-content has-[:disabled]:cursor-not-allowed has-[:disabled]:text-brand-disabled has-[:disabled]:opacity-70";
const inputClass = "peer absolute opacity-0";
const boxBaseClass =
  "mt-0.5 grid place-items-center rounded-none border border-brand-border-strong bg-brand-surface text-brand-surface peer-checked:bg-brand-accent peer-disabled:border-brand-disabled peer-disabled:bg-brand-border peer-disabled:text-brand-disabled peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-accent";
const descriptionClass = "font-system text-xs text-brand-muted";
const errorClass = "font-system text-xs font-bold text-brand-danger";

export type CheckboxSize = "xs" | "sm" | "md";

const checkboxGapClass: Record<CheckboxSize, string> = {
  xs: "gap-1",
  sm: "gap-1.5",
  md: "gap-grid-xs",
};

const boxSizeClass: Record<CheckboxSize, string> = {
  xs: "size-[14px] text-[0.5625rem]",
  sm: "size-4 text-[0.625rem]",
  md: "size-5 text-xs",
};

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> & {
  description?: string;
  error?: string;
  label: string | React.ReactNode;
  size?: CheckboxSize;
};

export function Checkbox({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  description,
  error,
  id,
  label,
  size = "md",
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const descriptionId = description ? `${checkboxId}-description` : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;

  return (
    <div className={mergeClassNames(fieldClass, className)}>
      <label
        className={mergeClassNames(checkboxBaseClass, checkboxGapClass[size])}
        htmlFor={checkboxId}
      >
        <input
          {...props}
          aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
          aria-invalid={error ? true : ariaInvalid}
          className={inputClass}
          id={checkboxId}
          type="checkbox"
        />
        <span
          className={mergeClassNames(boxBaseClass, boxSizeClass[size])}
          aria-hidden="true"
        >
          &#10003;
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
