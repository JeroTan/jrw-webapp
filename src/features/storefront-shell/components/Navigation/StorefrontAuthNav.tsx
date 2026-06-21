import * as React from "react";
import { useState } from "react";

import { signOutCustomer } from "@/features/customer-account";
import { StorefrontHeaderAction } from "./StorefrontHeaderAction";
import { StorefrontHeaderCta } from "./StorefrontHeaderCta";

export async function completeCustomerSignOut(
  signOut: () => Promise<unknown> = signOutCustomer,
  navigate: (href: string) => void = (href) => window.location.assign(href)
) {
  await signOut();
  navigate("/");
}

export function StorefrontAuthNav() {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  return (
    <nav
      aria-label="Customer account"
      className="flex flex-wrap items-center gap-grid-xs"
    >
      <StorefrontHeaderCta href="/account/profile">ACCOUNT</StorefrontHeaderCta>
      <StorefrontHeaderCta href="/account/orders" variant="ghost">
        ORDERS
      </StorefrontHeaderCta>
      <StorefrontHeaderAction
        loading={signingOut}
        loadingLabel="Signing out"
        onClick={async () => {
          setSigningOut(true);
          setSignOutError(false);
          try {
            await completeCustomerSignOut();
          } catch {
            setSignOutError(true);
            setSigningOut(false);
          }
        }}
      >
        SIGN OUT
      </StorefrontHeaderAction>
      {signOutError ? (
        <span className="sr-only" role="alert">
          Sign out failed. Try again.
        </span>
      ) : null}
    </nav>
  );
}
