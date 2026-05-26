import * as React from "react";
import type { ReactNode } from "react";

type VariantWrapperProps = {
  children: ReactNode;
  label: string;
};

export function VariantWrapper({ children, label }: VariantWrapperProps) {
  return (
    <div className="grid gap-grid-xs">
      <h3 className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        {label}
      </h3>
      <div className="flex flex-wrap gap-grid-xs">{children}</div>
    </div>
  );
}

export default VariantWrapper;
