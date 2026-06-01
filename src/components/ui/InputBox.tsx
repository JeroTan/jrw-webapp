import * as React from "react";
import { useId, type InputHTMLAttributes } from "react";

import { mergeClassNames, mergeIds } from "../utils";
import { ErrorLabel } from "./ErrorLabel";
import { Input, type InputBorderTone } from "./Input";
import { Label } from "./Label";

const inputBoxClass = "grid min-w-0 gap-grid-xs";
const descriptionClass = "font-system text-xs text-brand-muted";

export type InputBoxProps = InputHTMLAttributes<HTMLInputElement> & {
  borderTone?: InputBorderTone;
  description?: string;
  error?: string;
  hideLabel?: boolean;
  inputClassName?: string;
  label: string;
};

export function InputBox({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  borderTone = "strong",
  className,
  description,
  error,
  hideLabel = false,
  id,
  inputClassName,
  label,
  required,
  ...props
}: InputBoxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={mergeClassNames(inputBoxClass, className)}>
      <Label htmlFor={inputId} hideLabel={hideLabel} required={required}>
        {label}
      </Label>

      {description ? (
        <p className={descriptionClass} id={descriptionId}>
          {description}
        </p>
      ) : null}

      <Input
        {...props}
        aria-describedby={mergeIds(ariaDescribedBy, descriptionId, errorId)}
        aria-invalid={error ? true : ariaInvalid}
        borderTone={borderTone}
        className={inputClassName}
        id={inputId}
        required={required}
      />

      <ErrorLabel id={errorId}>{error}</ErrorLabel>
    </div>
  );
}
