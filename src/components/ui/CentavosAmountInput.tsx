import * as React from "react";
import { useEffect, useId, useState } from "react";

import { mergeClassNames, mergeIds } from "../utils";
import { ErrorLabel } from "./ErrorLabel";
import { Input } from "./Input";

type AmountParts = {
  centavos: string;
  pesos: string;
};

export type CentavosAmountInputProps = {
  "aria-describedby"?: string;
  className?: string;
  description?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  label: string;
  onChangeCentavos: (value: number | null) => void;
  required?: boolean;
  valueCentavos: number | null;
};

function cleanDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

function normalizeCentavos(value: number | null) {
  return Number.isSafeInteger(value) && value !== null && value >= 0
    ? value
    : null;
}

function splitCentavos(value: number | null): AmountParts {
  const normalized = normalizeCentavos(value);

  if (normalized === null) {
    return { centavos: "", pesos: "" };
  }

  return {
    centavos: String(normalized % 100).padStart(2, "0"),
    pesos: String(Math.floor(normalized / 100)),
  };
}

function combineParts(parts: AmountParts) {
  if (parts.pesos.length === 0 && parts.centavos.length === 0) {
    return null;
  }

  const pesos = parts.pesos.length > 0 ? Number(parts.pesos) : 0;
  const centavos =
    parts.centavos.length > 0 ? Number(parts.centavos.padStart(2, "0")) : 0;

  if (!Number.isSafeInteger(pesos) || !Number.isSafeInteger(centavos)) {
    return null;
  }

  return pesos * 100 + centavos;
}

export function CentavosAmountInput({
  "aria-describedby": ariaDescribedBy,
  className,
  description,
  disabled = false,
  error,
  id,
  label,
  onChangeCentavos,
  required = false,
  valueCentavos,
}: CentavosAmountInputProps) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const labelId = `${baseId}-label`;
  const descriptionId = description ? `${baseId}-description` : undefined;
  const errorId = error ? `${baseId}-error` : undefined;
  const [parts, setParts] = useState<AmountParts>(() =>
    splitCentavos(valueCentavos)
  );

  useEffect(() => {
    setParts((current) =>
      combineParts(current) === normalizeCentavos(valueCentavos)
        ? current
        : splitCentavos(valueCentavos)
    );
  }, [valueCentavos]);

  function updateParts(next: AmountParts) {
    setParts(next);
    onChangeCentavos(combineParts(next));
  }

  function normalizeDisplay() {
    setParts((current) => splitCentavos(combineParts(current)));
  }

  const describedBy = mergeIds(ariaDescribedBy, descriptionId, errorId);

  return (
    <div className={mergeClassNames("grid min-w-0 gap-grid-xs", className)}>
      <div className="brand-title-secondary" id={labelId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </div>

      {description ? (
        <p className="font-system text-xs text-brand-muted" id={descriptionId}>
          {description}
        </p>
      ) : null}

      <div
        aria-describedby={describedBy}
        aria-labelledby={labelId}
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(4.5rem,6rem)] items-end gap-grid-xs"
        role="group"
      >
        <label className="grid min-w-0 gap-grid-xs">
          <span className="font-system text-xs text-brand-muted">Pesos</span>
          <Input
            aria-invalid={error ? true : undefined}
            aria-label={`${label} pesos`}
            aria-required={required}
            disabled={disabled}
            inputMode="numeric"
            onBlur={normalizeDisplay}
            onChange={(event) =>
              updateParts({
                ...parts,
                pesos: cleanDigits(event.currentTarget.value),
              })
            }
            pattern="[0-9]*"
            textSize="sm"
            value={parts.pesos}
          />
        </label>

        <span
          aria-hidden="true"
          className="pb-[0.45rem] font-heading text-2xl font-bold leading-none text-brand-content"
        >
          .
        </span>

        <label className="grid min-w-0 gap-grid-xs">
          <span className="font-system text-xs text-brand-muted">Centavos</span>
          <Input
            aria-invalid={error ? true : undefined}
            aria-label={`${label} centavos`}
            aria-required={required}
            disabled={disabled}
            inputMode="numeric"
            maxLength={2}
            onBlur={normalizeDisplay}
            onChange={(event) =>
              updateParts({
                ...parts,
                centavos: cleanDigits(event.currentTarget.value, 2),
              })
            }
            pattern="[0-9]*"
            placeholder="00"
            textSize="sm"
            value={parts.centavos}
          />
        </label>
      </div>

      <ErrorLabel id={errorId}>{error}</ErrorLabel>
    </div>
  );
}
