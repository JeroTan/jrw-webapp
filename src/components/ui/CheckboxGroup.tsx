import * as React from "react";
import { useId } from "react";

import { mergeClassNames } from "../utils";
import { Checkbox, type CheckboxSize } from "./Checkbox";

export type CheckboxGroupOption = {
  description?: string;
  label: string;
  value: string;
};

export type CheckboxGroupProps = {
  className?: string;
  defaultValues?: string[];
  description?: string;
  legend: string;
  name: string;
  options: CheckboxGroupOption[];
  size?: CheckboxSize;
};

const optionSizeClass: Record<CheckboxSize, string> = {
  xs: "px-2 py-1 text-[0.6875rem]",
  sm: "px-grid-xs py-2 text-xs",
  md: "px-grid-xs py-2 text-xs",
};

function optionId(groupId: string, value: string, index: number): string {
  const safeValue = value.trim().replace(/[^a-z0-9_-]+/gi, "-");
  return `${groupId}-${safeValue || index}`;
}

export function CheckboxGroup({
  className,
  defaultValues = [],
  description,
  legend,
  name,
  options,
  size = "md",
}: CheckboxGroupProps) {
  const groupId = useId();
  const descriptionId = description ? `${groupId}-description` : undefined;
  const selectedValues = new Set(defaultValues);

  return (
    <fieldset
      aria-describedby={descriptionId}
      className={mergeClassNames(
        "m-0 grid gap-grid-xs border-0 p-0",
        className
      )}
    >
      <legend className="brand-title-secondary">{legend}</legend>

      {description ? (
        <p
          className="m-0 font-system text-xs text-brand-muted"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-grid-xs">
        {options.map((option, index) => (
          <Checkbox
            className={mergeClassNames(
              "w-fit max-w-full border border-brand-border bg-brand-surface font-system font-bold",
              optionSizeClass[size]
            )}
            defaultChecked={selectedValues.has(option.value)}
            description={option.description}
            id={optionId(groupId, option.value, index)}
            key={option.value}
            label={option.label}
            name={name}
            size={size}
            value={option.value}
          />
        ))}
      </div>
    </fieldset>
  );
}
