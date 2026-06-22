import * as React from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const sidebarLinks = [
  {
    href: "/account/profile",
    label: "Profile",
    value: "profile",
  },
  {
    href: "/account/orders",
    label: "Orders",
    value: "orders",
  },
] as const;

type AccountDashboardSection = (typeof sidebarLinks)[number]["value"];

function sectionLabel(section: AccountDashboardSection) {
  return (
    sidebarLinks.find((link) => link.value === section)?.label ?? "Account"
  );
}

function defaultTitle(section: AccountDashboardSection) {
  return section === "orders" ? "Your orders" : "Your profile";
}

function defaultDescription(section: AccountDashboardSection) {
  if (section === "orders") {
    return "Review customer order activity as JRW account features become available.";
  }

  return "Manage the customer details JRW can reuse for faster checkout.";
}

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
  const resolvedTitle = title ?? defaultTitle(currentSection);
  const resolvedDescription = description ?? defaultDescription(currentSection);
  const activeSectionLabel = sectionLabel(currentSection);

  return (
    <div className="min-h-screen text-brand-content">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-grid-sm focus:top-grid-sm focus:z-10 focus:border focus:border-brand-accent focus:bg-brand-surface focus:p-grid-xs"
        href="#account-main"
      >
        Skip to account content
      </a>
      <div className="grid min-h-screen lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="grid content-start border-b border-brand-border bg-brand-surface lg:border-b-0 lg:border-r">
          <div className="grid gap-grid-xs border-b border-brand-border p-grid-sm lg:px-grid-sm lg:py-grid-xs">
            <p className="m-0 font-system text-[0.65rem] font-bold uppercase text-brand-muted">
              Account space
            </p>

            <details className="group grid lg:hidden">
              <summary className="inline-flex min-h-control-md w-full cursor-pointer list-none items-center justify-between border border-brand-border-strong bg-brand-surface px-grid-sm py-grid-xs font-system text-xs font-bold uppercase text-brand-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent [&::-webkit-details-marker]:hidden">
                <span>{activeSectionLabel}</span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 group-open:hidden"
                  strokeWidth={2}
                />
                <ChevronUp
                  aria-hidden="true"
                  className="hidden size-4 group-open:inline"
                  strokeWidth={2}
                />
              </summary>
              <nav
                aria-label="Account sections"
                className="grid border-x border-b border-brand-border-strong"
                role="list"
              >
                {sidebarLinks.map((link) => {
                  const active = link.value === currentSection;
                  return (
                    <div className="grid" key={link.value} role="listitem">
                      <a
                        aria-current={active ? "page" : undefined}
                        className={`inline-flex min-h-control-md items-center justify-between border-b border-brand-border px-grid-sm py-grid-sm font-system text-xs font-bold uppercase no-underline last:border-b-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent ${
                          active
                            ? "bg-brand-content text-brand-surface"
                            : "bg-brand-surface text-brand-content hover:text-brand-accent"
                        }`}
                        href={link.href}
                      >
                        {link.label}
                      </a>
                    </div>
                  );
                })}
              </nav>
            </details>
          </div>

          <nav
            aria-label="Account sections"
            className="hidden border-t border-brand-border lg:grid"
            role="list"
          >
            {sidebarLinks.map((link) => {
              const active = link.value === currentSection;
              return (
                <div className="grid" key={link.value} role="listitem">
                  <a
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-control-md items-center justify-between border-b border-brand-border px-grid-sm py-grid-sm font-system text-xs font-bold uppercase no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent ${
                      active
                        ? "bg-brand-content text-brand-surface"
                        : "bg-brand-surface text-brand-content hover:text-brand-accent"
                    }`}
                    href={link.href}
                  >
                    {link.label}
                  </a>
                </div>
              );
            })}
          </nav>
        </aside>

        <main
          aria-label="Customer account workspace"
          className="min-w-0 p-grid-sm"
          id="account-main"
        >
            <section className="grid gap-grid-sm">
              <section
                aria-label={`${resolvedTitle} content`}
                className="grid gap-grid-sm pt-grid-sm pb-grid-md"
              >
                <div className="grid gap-grid-md">
                  {children}
                </div>
              </section>
            </section>
        </main>
      </div>
    </div>
  );
}
