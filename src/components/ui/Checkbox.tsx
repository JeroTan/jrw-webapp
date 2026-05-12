import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

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
    <div className={mergeClassNames("jrw-field", className)}>
      <label className="jrw-checkbox" htmlFor={checkboxId}>
        <input
          {...props}
          aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
          aria-invalid={error ? true : ariaInvalid}
          className="jrw-checkbox__input"
          id={checkboxId}
          type="checkbox"
        />
        <span className="jrw-checkbox__box" aria-hidden="true">
          ✓
        </span>
        <span className="jrw-checkbox__label">{label}</span>
      </label>
      {description ? (
        <p className="jrw-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="jrw-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
