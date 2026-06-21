import * as React from "react";
import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui";

export function AccountShell({
  children,
  description,
  eyebrow = "Customer account",
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <section className="overflow-hidden border border-brand-border-strong bg-brand-background">
      <div className="grid lg:grid-cols-[minmax(340px,520px)_1fr]">
        <div className="grid content-start gap-grid-md border-b border-brand-border-strong bg-brand-surface p-grid-md lg:border-b-0 lg:border-r">
          {children}
        </div>

        <aside className="grid min-w-0 content-start gap-grid-sm bg-brand-background p-grid-md">
          <p className="font-system text-xs font-bold uppercase tracking-[0.22em] text-brand-muted">
            {eyebrow}
          </p>
          <h1 className="max-w-2xl font-identity text-5xl font-black leading-[0.92] text-brand-content md:text-6xl">
            {title}
          </h1>
          <p className="max-w-xl text-sm leading-6 text-brand-muted md:text-base">
            {description}
          </p>
        </aside>
      </div>

      <div className="flex flex-wrap gap-grid-xs border-t border-brand-border-strong bg-brand-surface p-grid-sm">
        <ButtonLink href="/products" size="sm" textSize="xs" paddingX="xs">
          Browse products
        </ButtonLink>
        <ButtonLink
          href="/"
          size="sm"
          textSize="xs"
          paddingX="xs"
          variant="ghost"
        >
          Storefront home
        </ButtonLink>
      </div>
    </section>
  );
}
