import * as React from "react";

import { StorefrontHeaderCta } from "./StorefrontHeaderCta";

export function StorefrontPublicNav() {
  return (
    <nav
      aria-label="Customer account"
      className="flex flex-wrap items-center gap-grid-xs"
    >
      <StorefrontHeaderCta href="/account/sign-in">SIGN IN</StorefrontHeaderCta>
      <StorefrontHeaderCta href="/account/register" variant="ghost">
        REGISTER
      </StorefrontHeaderCta>
    </nav>
  );
}
