import * as React from "react";
import { useMemo, useState } from "react";

import { Button, ButtonLink } from "@/components/ui";
import {
  getGoogleOAuthStartHref,
  sanitizeCustomerReturnTo,
  signInCustomer,
} from "./api";
import { AccountFormField } from "./components/AccountFormField";
import { AccountShell } from "./components/AccountShell";
import { customerAccountErrorMessage } from "./errors";

export function CustomerSignInPanel({ returnTo }: { returnTo?: string }) {
  const safeReturnTo = useMemo(
    () => sanitizeCustomerReturnTo(returnTo) ?? "/account/profile",
    [returnTo]
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AccountShell
      description="Sign in to reuse your profile details and prepare for account order history. Guest checkout still works without an account."
      title="Sign in to JRW."
    >
      <form
        className="grid max-w-xl gap-grid-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            await signInCustomer({ email, password });
            window.location.assign(safeReturnTo);
          } catch (submitError) {
            setError(customerAccountErrorMessage("sign-in", submitError));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {error ? (
          <p
            className="border border-brand-danger bg-brand-surface p-grid-xs text-sm text-brand-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <AccountFormField
          autoComplete="email"
          id="customer-sign-in-email"
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          maxLength={254}
          type="email"
          value={email}
        />
        <AccountFormField
          autoComplete="current-password"
          id="customer-sign-in-password"
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          maxLength={1024}
          type="password"
          value={password}
        />
        <div className="flex flex-wrap gap-grid-xs">
          <Button loading={submitting} loadingLabel="Signing in" type="submit">
            Sign in
          </Button>
          <ButtonLink href={getGoogleOAuthStartHref(safeReturnTo)}>
            Continue with Google
          </ButtonLink>
          <ButtonLink href="/account/register" variant="ghost">
            Create account
          </ButtonLink>
        </div>
      </form>
    </AccountShell>
  );
}
