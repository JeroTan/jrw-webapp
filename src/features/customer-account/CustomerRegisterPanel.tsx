import * as React from "react";
import { useMemo, useState } from "react";

import { Button, ButtonLink } from "@/components/ui";
import { registerCustomer, sanitizeCustomerReturnTo } from "./api";
import { AccountFormField } from "./components/AccountFormField";
import { AccountShell } from "./components/AccountShell";
import { customerAccountErrorMessage } from "./errors";

export function CustomerRegistrationSuccess() {
  return (
    <AccountShell
      description="Check your inbox for a verification email before signing in."
      title="Verify your email"
    >
      <div className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
        <p className="text-sm leading-6 text-brand-content">
          Your JRW. customer account was created. Open the verification email we
          sent to continue.
        </p>
        <div className="flex flex-wrap gap-grid-xs">
          <ButtonLink href="/account/sign-in">Go to sign in</ButtonLink>
          <ButtonLink href="/products" variant="ghost">
            Browse products
          </ButtonLink>
        </div>
      </div>
    </AccountShell>
  );
}

export function CustomerRegisterPanel({ returnTo }: { returnTo?: string }) {
  const safeReturnTo = useMemo(
    () => sanitizeCustomerReturnTo(returnTo) ?? "/account/profile",
    [returnTo]
  );
  const signInHref = `/account/sign-in${
    safeReturnTo ? `?returnTo=${encodeURIComponent(safeReturnTo)}` : ""
  }`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emailMarketingOptIn, setEmailMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (success) {
    return <CustomerRegistrationSuccess />;
  }

  return (
    <AccountShell
      description="Create a customer account for profile reuse and future order history."
      title="Create account."
    >
      <form
        className="grid gap-grid-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            await registerCustomer({
              displayName,
              email,
              emailMarketingOptIn,
              password,
            });
            setSuccess(true);
          } catch (submitError) {
            setError(customerAccountErrorMessage("register", submitError));
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div className="grid gap-1 border-b border-brand-border pb-grid-sm">
          <p className="font-system text-xs font-bold uppercase tracking-[0.16em] text-brand-muted">
            Register
          </p>
          <p className="text-sm leading-6 text-brand-muted">
            Start with email, password, and an optional display name. We will ask
            you to verify your email next.
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
          helpText="Use an email you can verify."
          id="customer-register-email"
          label="Email"
          name="email"
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          maxLength={254}
          type="email"
          value={email}
        />
        <AccountFormField
          autoComplete="new-password"
          helpText="Use at least 8 characters."
          id="customer-register-password"
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          minLength={8}
          maxLength={1024}
          type="password"
          value={password}
        />
        <AccountFormField
          autoComplete="nickname"
          helpText="This can be changed later from your profile."
          id="customer-register-display-name"
          label="Display name"
          name="displayName"
          maxLength={120}
          onChange={(event) => setDisplayName(event.currentTarget.value)}
          type="text"
          value={displayName}
        />

        <label className="flex items-start gap-grid-xs border border-brand-border bg-brand-background p-grid-xs text-sm leading-6 text-brand-content">
          <input
            checked={emailMarketingOptIn}
            className="mt-1 size-4 rounded-none border-brand-border-strong accent-brand-accent"
            onChange={(event) =>
              setEmailMarketingOptIn(event.currentTarget.checked)
            }
            type="checkbox"
          />
          <span>Send me JRW. updates and product notices.</span>
        </label>

        <Button
          fullWidth
          loading={submitting}
          loadingLabel="Creating account"
          type="submit"
        >
          Create account
        </Button>

        <p className="border-t border-brand-border pt-grid-sm text-center text-sm leading-6 text-brand-muted">
          Already have an account?{" "}
          <a
            className="font-system font-bold uppercase text-brand-content underline-offset-4 hover:text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            href={signInHref}
          >
            Sign in
          </a>
          .
        </p>
      </form>
    </AccountShell>
  );
}
