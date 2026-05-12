import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  description?: string;
  error?: string;
  hideLabel?: boolean;
  inputClassName?: string;
  label: string;
};

export function Input({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  description,
  error,
  hideLabel = false,
  id,
  inputClassName,
  label,
  required,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={mergeClassNames("jrw-field", className)}>
      <label
        className={mergeClassNames(
          "jrw-field__label",
          hideLabel && "jrw-sr-only",
        )}
        htmlFor={inputId}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {description ? (
        <p className="jrw-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <input
        {...props}
        aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
        aria-invalid={error ? true : ariaInvalid}
        className={mergeClassNames("jrw-field__control", inputClassName)}
        id={inputId}
        required={required}
      />
      {error ? (
        <p className="jrw-field__error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
