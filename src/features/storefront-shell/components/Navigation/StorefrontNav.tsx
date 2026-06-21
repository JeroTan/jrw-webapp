import * as React from "react";

import { storefrontNavLinks } from "../../data";
import { NavButton } from "./Navbutton";

const NAV_MATCH_BASE = "https://jrw.local";

function parseRoute(route: string) {
  const parsed = new URL(route, NAV_MATCH_BASE);
  const pathname =
    parsed.pathname.length > 1 ? parsed.pathname.replace(/\/$/, "") : "/";

  return {
    pathname,
    searchParams: parsed.searchParams,
  };
}

function getActiveNavHref(currentUrl: string) {
  const currentRoute = parseRoute(currentUrl);

  if (
    currentRoute.pathname === "/products" &&
    currentRoute.searchParams.get("view") === "categories"
  ) {
    return "/categories";
  }

  if (
    currentRoute.pathname === "/products" &&
    currentRoute.searchParams.get("sort") === "new"
  ) {
    return "/products?sort=new";
  }

  if (
    currentRoute.pathname === "/categories" ||
    currentRoute.pathname.startsWith("/categories/")
  ) {
    return "/categories";
  }

  if (
    currentRoute.pathname === "/brands" ||
    currentRoute.pathname.startsWith("/brands/")
  ) {
    return "/brands";
  }

  if (
    currentRoute.pathname === "/products" ||
    currentRoute.pathname.startsWith("/products/")
  ) {
    return "/products";
  }

  return undefined;
}

export function StorefrontNav({
  currentUrl = "/",
  mobile = false,
}: {
  currentUrl?: string;
  mobile?: boolean;
}) {
  const activeNavHref = getActiveNavHref(currentUrl);

  return (
    <nav aria-label="Storefront navigation" className="h-full">
      <ul
        className={`xl:h-full md:h-14 h-full list-none ${
          mobile
            ? "grid m-0 p-0"
            : "flex xl:justify-start md:justify-end md:flex-nowrap flex-wrap md:overflow-x-auto "
        }`}
      >
        {storefrontNavLinks.map((link, index) => (
          <li className="xl:basis-auto basis-full h-full" key={link.href}>
            <NavButton
              active={link.href === activeNavHref}
              href={link.href}
              singleBorder={index !== storefrontNavLinks.length - 1}
              dividerDirection={mobile ? "horizontal" : "vertical"}
            >
              {link.label}
            </NavButton>
          </li>
        ))}
      </ul>
    </nav>
  );
}
