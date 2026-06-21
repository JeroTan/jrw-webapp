import * as React from "react";
import { useMemo, useState } from "react";

import { Button, ButtonLink, Checkbox } from "@/components/ui";
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
  const [confirmPassword, setConfirmPassword] = useState("");
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
          if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
          }
          setSubmitting(true);
          try {
            await registerCustomer({
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
            Start with email and password. You can change your display name
            later from your profile.
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
          placeholder="you@example.com"
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
          placeholder="Create a password"
          required
          minLength={8}
          maxLength={1024}
          type="password"
          value={password}
        />
        <AccountFormField
          autoComplete="new-password"
          id="customer-register-confirm-password"
          label="Confirm password"
          name="confirmPassword"
          onChange={(event) => setConfirmPassword(event.currentTarget.value)}
          placeholder="Confirm your password"
          required
          minLength={8}
          maxLength={1024}
          type="password"
          value={confirmPassword}
        />
        <Checkbox
          checked={emailMarketingOptIn}
          label="Send me JRW. updates and product notices."
          onChange={(event) =>
            setEmailMarketingOptIn(event.currentTarget.checked)
          }
          size="sm"
        />

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
