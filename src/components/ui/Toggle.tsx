import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

export type ToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  description?: string;
  error?: string;
  label: string;
};

export function Toggle({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
  description,
  error,
  id,
  label,
  ...props
}: ToggleProps) {
  const generatedId = useId();
  const toggleId = id ?? generatedId;
  const descriptionId = description ? `${toggleId}-description` : undefined;
  const errorId = error ? `${toggleId}-error` : undefined;

  return (
    <div className={mergeClassNames("jrw-field", className)}>
      <label className="jrw-toggle" htmlFor={toggleId}>
        <input
          {...props}
          aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
          aria-invalid={error ? true : ariaInvalid}
          className="jrw-toggle__input"
          id={toggleId}
          role="switch"
          type="checkbox"
        />
        <span className="jrw-toggle__track" aria-hidden="true" />
        <span className="jrw-toggle__label">{label}</span>
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
