import * as React from "react";
import { CleanButton, CleanLinkButton } from "@/components/ui";
import { mergeClassNames } from "../utils";

export type DashboardRole = "ADMIN" | "SUPER_ADMIN";

type NavItem = {
  href: string;
  label: string;
};

const dailyNav: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/brands", label: "Brands" },
  { href: "/admin/products?focus=inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/settings", label: "Settings" },
];

const ownerNav: NavItem[] = [
  { href: "/admin/accounts", label: "Admin Accounts" },
  { href: "/admin/owner/transfer", label: "Ownership Transfer" },
  { href: "/admin/audit?scope=owner", label: "Owner Audit" },
];

function roleLabel(role: DashboardRole): string {
  return role === "SUPER_ADMIN" ? "Super Admin" : "Admin";
}

async function defaultLogout() {
  if (typeof window === "undefined") return;

  await fetch("/api/admin/auth/sessions/current", {
    credentials: "include",
    method: "DELETE",
  });
  window.location.assign("/admin/sign-in");
}

export function SidebarNav({
  activeHref = "/admin",
  role,
}: {
  activeHref?: string;
  role: DashboardRole;
}) {
  const isOwner = role === "SUPER_ADMIN";

  return (
    <nav
      aria-label="Admin navigation"
      className="grid content-start gap-grid-sm border-r border-brand-border bg-brand-surface p-grid-sm"
    >
      <a
        className="grid gap-[0.15rem] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        href="/admin"
      >
        <span className="font-identity text-[1.6rem] font-black leading-none">
          JRW.
        </span>
        <span className="font-system text-[0.65rem] font-bold uppercase text-brand-muted">
          Admin console
        </span>
      </a>

      <div className="grid gap-1 border-t border-brand-border pt-grid-xs" role="list">
        {dailyNav.map((item) => (
          <CleanLinkButton
            active={item.href === activeHref}
            aria-current={item.href === activeHref ? "page" : undefined}
            className={mergeClassNames(
              "justify-start px-grid-xs py-grid-xs text-xs uppercase",
              item.href !== activeHref && "text-brand-content"
            )}
            href={item.href}
            key={item.href}
            role="listitem"
          >
            {item.label}
          </CleanLinkButton>
        ))}
      </div>

      {isOwner ? (
        <section aria-labelledby="owner-nav-title" className="grid gap-1 border-t border-brand-border pt-grid-sm">
          <h2 className="m-0 font-system text-[0.65rem] font-bold uppercase text-brand-muted" id="owner-nav-title">
            Owner-only
          </h2>
          {ownerNav.map((item) => (
            <CleanLinkButton
              active={item.href === activeHref}
              aria-current={item.href === activeHref ? "page" : undefined}
              className={mergeClassNames(
                "justify-start px-grid-xs py-grid-xs text-xs uppercase",
                item.href !== activeHref && "text-brand-content"
              )}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </CleanLinkButton>
          ))}
        </section>
      ) : null}
    </nav>
  );
}

export function TopBar({
  actionSlot,
  brandScopeLabel = "All brands",
  onLogout,
  role,
  searchSlot,
  userLabel,
}: {
  actionSlot?: React.ReactNode;
  brandScopeLabel?: string;
  onLogout?: () => void | Promise<void>;
  role: DashboardRole;
  searchSlot?: React.ReactNode;
  userLabel?: string;
}) {
  const logoutHandler = onLogout ?? defaultLogout;

  return (
    <header className="grid gap-grid-xs border-b border-brand-border bg-brand-surface p-grid-sm lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex flex-wrap items-center gap-grid-xs">
        <span className="bg-brand-border px-grid-xs py-[0.3rem] font-system text-xs font-bold uppercase text-brand-muted">
          {roleLabel(role)}
        </span>
        <span className="bg-brand-border px-grid-xs py-[0.3rem] font-system text-xs font-bold uppercase">
          {brandScopeLabel}
        </span>
        <span className="font-system text-xs text-brand-muted">
          {userLabel ?? roleLabel(role)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-start gap-grid-xs lg:justify-end">
        {searchSlot ?? (
          <label className="sr-only" htmlFor="admin-shell-search">
            Search admin
          </label>
        )}
        {searchSlot ? null : (
          <input
            className="min-h-control-md border border-brand-border bg-brand-background px-grid-sm font-system text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            id="admin-shell-search"
            placeholder="Search admin"
            type="search"
          />
        )}
        {actionSlot ?? null}
        <CleanButton onClick={logoutHandler} size="sm">
          Sign out
        </CleanButton>
      </div>
    </header>
  );
}

export function DashboardShell({
  activeHref,
  actionSlot,
  brandScopeLabel,
  children,
  mainLabel = "Admin work area",
  onLogout,
  role,
  searchSlot,
  userLabel,
}: {
  activeHref?: string;
  actionSlot?: React.ReactNode;
  brandScopeLabel?: string;
  children?: React.ReactNode;
  mainLabel?: string;
  onLogout?: () => void | Promise<void>;
  role: DashboardRole;
  searchSlot?: React.ReactNode;
  userLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-brand-background text-brand-content">
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:left-grid-sm focus:top-grid-sm focus:z-10 focus:border focus:border-brand-accent focus:bg-brand-surface focus:p-grid-xs"
        href="#admin-main"
      >
        Skip to admin content
      </a>
      <div className="grid min-h-screen lg:grid-cols-[240px_minmax(0,1fr)]">
        <SidebarNav activeHref={activeHref} role={role} />
        <div className="grid min-w-0 grid-rows-[auto_1fr]">
          <TopBar
            actionSlot={actionSlot}
            brandScopeLabel={brandScopeLabel}
            onLogout={onLogout}
            role={role}
            searchSlot={searchSlot}
            userLabel={userLabel}
          />
          <main aria-label={mainLabel} className="min-w-0 p-grid-sm" id="admin-main">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminShellLoading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading admin session"
      className="grid min-h-screen place-items-center bg-brand-background p-grid-md"
    >
      <p className="border border-brand-border-strong bg-brand-surface p-grid-sm font-system text-xs font-bold uppercase text-brand-muted">
        Loading admin session
      </p>
    </section>
  );
}

export function AdminShellForbidden({
  message = "You need a Super Admin or approved Admin session to view this area.",
}: {
  message?: string;
}) {
  return (
    <DashboardShell activeHref="/admin" role="ADMIN" userLabel="Signed out">
      <section
        aria-labelledby="admin-forbidden-title"
        className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md"
      >
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          Forbidden
        </p>
        <h1 className="m-0 font-identity text-[clamp(2rem,6vw,3.5rem)]" id="admin-forbidden-title">
          Permission needed
        </h1>
        <p className="m-0 max-w-[64ch] text-sm text-brand-muted">{message}</p>
      </section>
    </DashboardShell>
  );
}
