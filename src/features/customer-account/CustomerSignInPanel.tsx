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
  const registerHref = `/account/register${
    safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ""
  }`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <AccountShell
      description="Sign in to reuse your saved profile details and keep account actions in one place."
      title="Welcome back."
    >
      <form
        className="grid gap-grid-sm"
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
        <div className="grid gap-1 border-b border-brand-border pb-grid-sm">
          <p className="font-system text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">
            Sign in
          </p>
          <p className="text-sm leading-6 text-brand-muted">
            Enter your customer account details or continue with Google.
          </p>
        </div>

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

        <div className="grid gap-grid-xs pt-grid-xs">
          <Button
            fullWidth
            loading={submitting}
            loadingLabel="Signing in"
            type="submit"
          >
            Sign in
          </Button>
          <ButtonLink fullWidth href={getGoogleOAuthStartHref(safeReturnTo)}>
            Continue with Google
          </ButtonLink>
        </div>

        <p className="border-t border-brand-border pt-grid-sm text-center text-sm leading-6 text-brand-muted">
          No account yet?{" "}
          <a
            className="font-system font-bold uppercase text-brand-content underline-offset-4 hover:text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            href={registerHref}
          >
            Create one
          </a>
          .
        </p>
      </form>
    </AccountShell>
  );
}
