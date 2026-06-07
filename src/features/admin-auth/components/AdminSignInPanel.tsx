import * as React from "react";
import { Button } from "@/components/ui";
import { createAdminSession } from "../api";
import { InputBox } from "@/components/ui/InputBox";

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
      window.location.assign(
        result.data.actor.role === "SUPER_ADMIN"
          ? "/admin/owner/transfer"
          : "/admin"
      );
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
      <h1
        className="m-0 font-identity text-[clamp(2rem,8vw,4rem)]"
        id="admin-sign-in-title"
      >
        Sign In
      </h1>
      <p className="m-0 mb-3 text-sm text-brand-muted">
        Enter your email and password to access the dashboard.
      </p>
      <form className="grid gap-grid-sm" onSubmit={handleSubmit}>
        <InputBox
          label="Email"
          placeholder="sample.admin@mail.com"
          type="email"
          value={email}
          autoComplete="email"
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        <InputBox
          label="Password"
          placeholder="your-admin-password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.currentTarget.value)}
          className="mb-5"
        />

        <Button
          disabled={submitting}
          fullWidth
          loading={submitting}
          loadingLabel="Signing in"
          type="submit"
          variant="primary"
        >
          Sign in
        </Button>
      </form>
      {message ? (
        <p className="m-0 border border-brand-danger p-grid-xs text-sm text-brand-danger">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-grid-xs justify-center">
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
