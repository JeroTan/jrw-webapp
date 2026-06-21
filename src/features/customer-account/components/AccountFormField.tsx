import * as React from "react";
import type { InputHTMLAttributes } from "react";

import { Input } from "@/components/ui";

export function AccountFormField({
  error,
  helpText,
  id,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  error?: string;
  helpText?: string;
  id: string;
  label: string;
}) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="font-system text-xs font-bold uppercase text-brand-content">
        {label}
      </span>
      <Input
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        id={id}
        textSize="sm"
        {...props}
      />
      {helpText ? (
        <span className="text-xs leading-5 text-brand-muted" id={helpId}>
          {helpText}
        </span>
      ) : null}
      {error ? (
        <span className="text-xs leading-5 text-brand-danger" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
