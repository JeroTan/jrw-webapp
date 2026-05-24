import * as React from "react";
import {
  AdminShellForbidden,
  AdminShellLoading,
  DashboardShell,
} from "@/components/layout";
import {
  deleteCurrentAdminSession,
  getCurrentAdminSession,
  type AdminActor,
} from "../api";
import { AdminSignInPanel } from "./AdminSignInPanel";

type SessionState =
  | { status: "loading" }
  | { actor: AdminActor; status: "authenticated" }
  | { status: "unauthenticated" }
  | { message: string; status: "forbidden" };

export function AdminSessionGate() {
  const [state, setState] = React.useState<SessionState>({ status: "loading" });

  React.useEffect(() => {
    let mounted = true;

    getCurrentAdminSession().then((result) => {
      if (!mounted) return;

      if (!result.ok) {
        setState({ message: result.message, status: "forbidden" });
        return;
      }

      if (!result.data.authenticated || !result.data.actor) {
        setState({ status: "unauthenticated" });
        return;
      }

      setState({ actor: result.data.actor, status: "authenticated" });
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return <AdminShellLoading />;
  }

  if (state.status === "unauthenticated") {
    return <AdminSignInPanel />;
  }

  if (state.status === "forbidden") {
    return <AdminShellForbidden message={state.message} />;
  }

  return (
    <DashboardShell
      activeHref="/admin"
      onLogout={async () => {
        await deleteCurrentAdminSession();
        window.location.assign("/admin/sign-in");
      }}
      role={state.actor.role}
      userLabel={state.actor.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
    >
      <section className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-md">
        <p className="m-0 font-system text-xs font-bold uppercase text-brand-muted">
          Operations
        </p>
        <h1 className="m-0 font-identity text-[clamp(2rem,6vw,3.5rem)]">
          Admin dashboard
        </h1>
        <p className="m-0 max-w-[68ch] text-sm text-brand-muted">
          Choose a dashboard area from the sidebar. Existing resource pages stay
          available while console wrapping lands in the next story.
        </p>
      </section>
    </DashboardShell>
  );
}
