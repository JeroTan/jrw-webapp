import * as React from "react";
import type { ReactNode } from "react";

const sidebarLinks = [
  {
    href: "/account/profile",
    label: "Profile",
    value: "profile",
  },
] as const;

type AccountDashboardSection = (typeof sidebarLinks)[number]["value"];

export function AccountDashboardShell({
  children,
  currentSection = "profile",
  description,
  eyebrow = "Customer account",
  title,
}: {
  children: ReactNode;
  currentSection?: AccountDashboardSection;
  description?: string;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <section className="grid min-h-[calc(100svh-9rem)] bg-brand-background lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="border-b border-brand-border-strong bg-brand-surface p-grid-md lg:border-b-0 lg:border-r">
        <div className="grid gap-grid-sm lg:sticky lg:top-grid-md">
          <div className="grid gap-1">
            <p className="font-system text-xs font-bold uppercase tracking-[0.22em] text-brand-muted">
              Customer account
            </p>
            <p className="font-identity text-2xl font-black leading-none text-brand-content">
              Account
            </p>
          </div>

          <nav aria-label="Account sections" className="grid gap-grid-xs">
            {sidebarLinks.map((link) => {
              const active = link.value === currentSection;
              return (
                <a
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-control-md items-center justify-between border px-grid-xs font-system text-xs font-bold uppercase no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent ${
                    active
                      ? "border-brand-content bg-brand-content text-brand-surface"
                      : "border-brand-border-strong bg-brand-surface text-brand-content hover:border-brand-accent hover:text-brand-accent"
                  }`}
                  href={link.href}
                  key={link.value}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 bg-brand-background p-grid-md">
        {title ? (
          <div className="grid gap-grid-xs border-b border-brand-border-strong pb-grid-md">
            <p className="font-system text-xs font-bold uppercase tracking-[0.22em] text-brand-muted">
              {eyebrow}
            </p>
            <h1 className="font-identity text-5xl font-black leading-[0.92] text-brand-content md:text-6xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-brand-muted md:text-base">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-grid-md pt-grid-md">{children}</div>
      </div>
    </section>
  );
}
