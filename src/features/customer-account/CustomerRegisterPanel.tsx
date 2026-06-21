import * as React from "react";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui";
import { registerCustomer } from "./api";
import { AccountFormField } from "./components/AccountFormField";
import { AccountShell } from "./components/AccountShell";
import { customerAccountErrorMessage } from "./errors";

export function CustomerRegistrationSuccess() {
  return (
    <AccountShell
      description="Check your inbox for a verification email before signing in."
      title="Verify your email"
    >
      <div className="grid max-w-xl gap-grid-sm border border-brand-border bg-brand-background p-grid-sm">
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

export function CustomerRegisterPanel() {
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
      description="Create a Customer account for profile reuse and future order history. You can still shop as a guest."
      title="Create your account"
    >
      <form
        className="grid max-w-xl gap-grid-sm"
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
        {error ? (
          <p
            className="border border-brand-danger bg-brand-surface p-grid-xs text-sm text-brand-danger"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        <p className="text-sm leading-6 text-brand-muted">
          We use these details to create your account and send its verification
          email.
        </p>
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
          id="customer-register-display-name"
          label="Display name"
          name="displayName"
          maxLength={120}
          onChange={(event) => setDisplayName(event.currentTarget.value)}
          type="text"
          value={displayName}
        />
        <label className="flex items-start gap-grid-xs text-sm leading-6 text-brand-content">
          <input
            checked={emailMarketingOptIn}
            className="mt-1 size-4 rounded-none border-brand-border-strong accent-brand-accent"
            onChange={(event) =>
              setEmailMarketingOptIn(event.currentTarget.checked)
            }
            type="checkbox"
          />
          Send me JRW. updates and product notices.
        </label>
        <div className="flex flex-wrap gap-grid-xs">
          <Button
            loading={submitting}
            loadingLabel="Creating account"
            type="submit"
          >
            Create account
          </Button>
          <ButtonLink href="/account/sign-in" variant="ghost">
            Already have an account?
          </ButtonLink>
        </div>
      </form>
    </AccountShell>
  );
}
