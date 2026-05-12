import * as React from "react";
import { useId, type SelectHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  description?: string;
  error?: string;
  hideLabel?: boolean;
  label: string;
  selectClassName?: string;
};

export function Select({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  children,
  className,
  description,
  error,
  hideLabel = false,
  id,
  label,
  required,
  selectClassName,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = description ? `${selectId}-description` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className={mergeClassNames("jrw-field", className)}>
      <label
        className={mergeClassNames(
          "jrw-field__label",
          hideLabel && "jrw-sr-only",
        )}
        htmlFor={selectId}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {description ? (
        <p className="jrw-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <select
        {...props}
        aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
        aria-invalid={error ? true : ariaInvalid}
        className={mergeClassNames("jrw-field__control", selectClassName)}
        id={selectId}
        required={required}
      >
        {children}
      </select>
      {error ? (
        <p className="jrw-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
