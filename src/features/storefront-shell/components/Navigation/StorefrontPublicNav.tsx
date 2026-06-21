import * as React from "react";

import { StorefrontHeaderCta } from "./StorefrontHeaderCta";

export function StorefrontPublicNav() {
  return (
    <nav aria-label="Customer account" className="flex items-center gap-grid-xs">
      <StorefrontHeaderCta href="/account/sign-in">SIGN IN</StorefrontHeaderCta>
    </nav>
  );
}
