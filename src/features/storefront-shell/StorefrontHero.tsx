import * as React from "react";

import { ButtonLink, type ButtonLinkVariant } from "@/components/ui";

type StorefrontHeroAction = {
  href: string;
  label: string;
  variant?: ButtonLinkVariant;
};

type StorefrontHeroProps = {
  actions?: StorefrontHeroAction[];
  copy: string;
  id: string;
  kicker: string;
  title: string;
  className?: string;
};

export function StorefrontHero({
  actions = [],
  copy,
  id,
  kicker,
  title,
  className = "",
}: StorefrontHeroProps) {
  return (
    <header
      className={`grid gap-grid-sm bg-brand-surface p-grid-md ${className}`}
    >
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        {kicker}
      </p>
      <h1
        className="max-w-[18ch] font-identity text-[clamp(2rem,8vw,4rem)] wrap-anywhere"
        id={id}
      >
        {title}
      </h1>
      <p className="max-w-[100ch] text-[0.9375rem] text-brand-muted">{copy}</p>
      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-grid-xs">
          {actions.map((action) => (
            <ButtonLink
              href={action.href}
              key={`${action.href}-${action.label}`}
              textSize="xs"
              variant={action.variant}
            >
              {action.label}
            </ButtonLink>
          ))}
        </div>
      ) : null}
    </header>
  );
}

export default StorefrontHero;
