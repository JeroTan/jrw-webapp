import * as React from "react";
import { storefrontNavLinks } from "./data";
import { NavButton } from "./components/Navigation/Navbutton";
import { ButtonLink } from "@/components/ui/ButtonLink";
import CartAction from "./components/Navigation/CartAction";
import SearchForm from "./components/Navigation/SearchForm";

function StorefrontNav({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav aria-label="Storefront navigation" className={"h-full"}>
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

export function StorefrontHeader() {
  return (
    <header
      className="border-b border-brand-border-strong bg-brand-surface"
      role="banner"
    >
      <div
        className="
        mx-auto min-h-17 w-[min(100%,1440px)] 3xl:px-grid-lg xs:px-grid-md px-grid-sm 
        md:grid xl:grid-cols-[auto_minmax(0,1fr)_minmax(260px,360px)_auto] md:grid-cols-[auto_minmax(220px,1fr)_auto] lg:gap-x-grid-md gap-x-grid-sm
        items-center
        flex justify-between 

      "
      >
        <a
          aria-label="JRW. lifestyle products home"
          className="
            h-full inline-flex items-center 
            font-identity text-3xl font-extrabold leading-none text-brand-content no-underline hover:text-brand-accent
            motion-safe:transition-colors motion-safe:duration-120"
          href="/"
        >
          JRW.
        </a>
        <div className="h-full md:block hidden  xl:col-auto md:col-span-full xl:row-auto md:row-start-2">
          <StorefrontNav />
        </div>

        <div className="md:block hidden xl:my-0 my-2 ">
          <SearchForm id="storefront-desktop-search" />
        </div>

        <div className="xl:my-0 my-2 flex items-center justify-self-end gap-grid-xs">
          <CartAction />
          <ButtonLink href="/account" size="md" textSize="xs" paddingX="xs">
            SIGN IN
          </ButtonLink>
          <details className="md:hidden  group relative">
            <summary className="inline-flex min-h-control-md min-w-control-md list-none items-center justify-center gap-1.5 border border-brand-border-strong px-grid-xs font-system text-xs font-bold uppercase marker:hidden group-open:border-brand-accent max-[374px]:px-1.5 max-[374px]:text-[0.6875rem] [&::-webkit-details-marker]:hidden">
              <span>Menu</span>
              <span aria-hidden="true" className="group-open:hidden">
                +
              </span>
              <span aria-hidden="true" className="hidden group-open:inline">
                -
              </span>
            </summary>

            <div className="absolute right-0 top-[calc(100%+8px)] z-30 grid w-[min(92vw,380px)] gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
              <SearchForm id="storefront-mobile-search" />
              <StorefrontNav mobile />
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export default StorefrontHeader;
