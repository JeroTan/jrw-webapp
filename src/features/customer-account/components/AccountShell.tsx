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
    <section className="grid gap-grid-md border border-brand-border-strong bg-brand-surface p-grid-md">
      <div className="grid gap-grid-xs border-b border-brand-border pb-grid-sm">
        <p className="font-system text-xs font-bold uppercase tracking-[0.18em] text-brand-muted">
          {eyebrow}
        </p>
        <h1 className="font-identity text-4xl font-black leading-none text-brand-content md:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-brand-muted md:text-base">
          {description}
        </p>
      </div>
      {children}
      <div className="flex flex-wrap gap-grid-xs border-t border-brand-border pt-grid-sm">
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
