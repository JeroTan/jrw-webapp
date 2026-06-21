import * as React from "react";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui";
import { getCustomerSession } from "./api";
import { AccountShell } from "./components/AccountShell";

export function AccountLanding() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    getCustomerSession()
      .then((session) => {
        if (!mounted) return;
        if (session.authenticated && session.actor?.role === "CUSTOMER") {
          window.location.replace("/account/profile");
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (mounted) setChecking(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AccountShell
      description="Sign in or create a Customer account for profile reuse and future order history. Checkout still works as a guest."
      title="Your JRW. account"
    >
      {checking ? (
        <p className="border border-brand-border bg-brand-background p-grid-sm text-sm text-brand-muted">
          Checking account state...
        </p>
      ) : (
        <div className="flex flex-wrap gap-grid-xs">
          <ButtonLink href="/account/sign-in">Sign in</ButtonLink>
          <ButtonLink href="/account/register" variant="primary">
            Create account
          </ButtonLink>
        </div>
      )}
    </AccountShell>
  );
}
