import * as React from "react";
import { Button } from "@/components/ui";
import {
  confirmAdminPasswordReset,
  requestAdminPasswordReset,
} from "../api";

export function AdminPasswordResetRequestPanel() {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setSubmitting(true);

    const result = await requestAdminPasswordReset({ email });

    setSubmitting(false);
    setMessage(
      result.ok
        ? "Password reset sent if account is eligible."
        : result.message
    );
  }

  return (
    <section
      aria-labelledby="admin-reset-title"
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md"
    >
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        Admin recovery
      </p>
      <h1 className="m-0 font-identity text-[clamp(2rem,8vw,4rem)]" id="admin-reset-title">
        Reset admin password
      </h1>
      <form className="grid gap-grid-sm" onSubmit={handleSubmit}>
        <label className="grid gap-[0.25rem] font-system text-xs font-bold uppercase text-brand-muted">
          Email
          <input
            autoComplete="email"
            className="min-h-control-md border border-brand-border-strong bg-brand-background px-grid-sm text-base text-brand-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            name="email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <Button disabled={submitting} loading={submitting} loadingLabel="Sending" variant="primary">
          Send reset link
        </Button>
      </form>
      {message ? <p className="m-0 text-sm text-brand-muted">{message}</p> : null}
    </section>
  );
}

export function AdminPasswordResetConfirmPanel({
  token = "",
}: {
  token?: string;
}) {
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setSubmitting(true);

    const result = await confirmAdminPasswordReset({ password, token });

    setSubmitting(false);
    setMessage(
      result.ok
        ? "Password reset complete. Sign in with the new password."
        : result.message
    );
  }

  return (
    <section
      aria-labelledby="admin-reset-confirm-title"
      className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md"
    >
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        Admin recovery
      </p>
      <h1
        className="m-0 font-identity text-[clamp(2rem,8vw,4rem)]"
        id="admin-reset-confirm-title"
      >
        Set new admin password
      </h1>
      <form className="grid gap-grid-sm" onSubmit={handleSubmit}>
        <label className="grid gap-[0.25rem] font-system text-xs font-bold uppercase text-brand-muted">
          New password
          <input
            autoComplete="new-password"
            className="min-h-control-md border border-brand-border-strong bg-brand-background px-grid-sm text-base text-brand-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <Button disabled={!token || submitting} loading={submitting} loadingLabel="Saving" variant="primary">
          Reset password
        </Button>
      </form>
      {!token ? (
        <p className="m-0 text-sm text-brand-danger">
          Reset token is missing. Request a new admin password reset.
        </p>
      ) : null}
      {message ? <p className="m-0 text-sm text-brand-muted">{message}</p> : null}
    </section>
  );
}
