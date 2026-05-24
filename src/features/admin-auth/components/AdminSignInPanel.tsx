import * as React from "react";
import { CleanButton } from "@/components/ui";
import { createAdminSession } from "../api";

export function AdminSignInPanel() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const result = await createAdminSession({ email, password });

    setSubmitting(false);

    if (result.ok) {
      window.location.assign("/admin");
      return;
    }

    setMessage(result.message);
  }

  return (
    <section
      aria-labelledby="admin-sign-in-title"
      className="grid gap-grid-sm border border-brand-border bg-brand-surface p-grid-md"
    >
      <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
        JRW. Admin
      </p>
      <h1 className="m-0 font-identity text-[clamp(2rem,8vw,4rem)]" id="admin-sign-in-title">
        Sign in to JRW admin
      </h1>
      <p className="m-0 text-sm text-brand-muted">
        Admin accounts are created by Super Admin.
      </p>
      <form className="grid gap-grid-sm" onSubmit={handleSubmit}>
        <label className="grid gap-[0.25rem] font-system text-xs font-bold uppercase text-brand-muted">
          Email
          <input
            autoComplete="email"
            className="min-h-control-md border border-brand-border bg-brand-background px-grid-sm text-base text-brand-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            name="email"
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="grid gap-[0.25rem] font-system text-xs font-bold uppercase text-brand-muted">
          Password
          <input
            autoComplete="current-password"
            className="min-h-control-md border border-brand-border bg-brand-background px-grid-sm text-base text-brand-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
            name="password"
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <CleanButton
          active
          disabled={submitting}
          fullWidth
          loading={submitting}
          loadingLabel="Signing in"
        >
          Sign in
        </CleanButton>
      </form>
      {message ? (
        <p className="m-0 border border-brand-danger p-grid-xs text-sm text-brand-danger">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-grid-xs">
        <a
          className="font-system text-xs font-bold uppercase text-brand-muted underline-offset-4 hover:text-brand-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          href="/admin/password-reset"
        >
          Forgot password
        </a>
      </div>
    </section>
  );
}
