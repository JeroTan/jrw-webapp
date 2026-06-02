import * as React from "react";
import { Modal } from "@/components/ui";
import { mergeClassNames } from "@/components/utils";

export type ProductEditorSurface = "modal" | "page";

export type ProductEditorChromeProps = {
  children: React.ReactNode;
  className?: string;
  description: string;
  footer: React.ReactNode;
  onClose: () => void;
  open: boolean;
  surface?: ProductEditorSurface;
  title: string;
};

export function ProductEditorChrome({
  children,
  className,
  description,
  footer,
  onClose,
  open,
  surface = "modal",
  title,
}: ProductEditorChromeProps) {
  if (surface === "modal") {
    return (
      <Modal
        className={className}
        description={description}
        footer={footer}
        onClose={onClose}
        open={open}
        title={title}
      >
        {children}
      </Modal>
    );
  }

  if (!open) {
    return null;
  }

  return (
    <section className="grid gap-grid-sm">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
        <div>
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Catalog product
          </p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">{title}</h1>
          <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
            {description}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-grid-xs">{footer}</div>
      </header>

      <div className={mergeClassNames("grid gap-grid-sm", className)}>
        {children}
      </div>
    </section>
  );
}
