import * as React from "react";
import { useId, type TextareaHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";

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
    <div className={mergeClassNames("jrw-field", className)}>
      <label
        className={mergeClassNames(
          "jrw-field__label",
          hideLabel && "jrw-sr-only",
        )}
        htmlFor={textareaId}
      >
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {description ? (
        <p className="jrw-field__description" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <textarea
        {...props}
        aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
        aria-invalid={error ? true : ariaInvalid}
        className={mergeClassNames("jrw-field__control", textareaClassName)}
        id={textareaId}
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
