export type AdminRole = "ADMIN" | "SUPER_ADMIN";

export type AdminAccountStatus = {
  approved: boolean;
  emailVerified: boolean;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

export type AdminActor = {
  accountStatus: AdminAccountStatus;
  id: string;
  role: AdminRole;
};

export type AdminSessionSummary = {
  expiresAt: string;
};

export type AdminSessionData = {
  actor: AdminActor;
  session: AdminSessionSummary;
};

export type AdminSessionInspection = {
  actor: AdminActor | null;
  authenticated: boolean;
  session: AdminSessionSummary | null;
};

export type AdminApiResult<T> =
  | { data: T; ok: true; status: number }
  | { message: string; ok: false; status: number };

type ApiSuccess<T> = {
  data: T;
};

type Fetcher = typeof fetch;

function safeAdminAuthMessage(status: number): string {
  if (status === 401 || status === 403) {
    return "Sign in failed. Check credentials and account status.";
  }

  if (status === 400) {
    return "Check required fields and try again.";
  }

  if (status === 429) {
    return "Too many attempts. Try again later.";
  }

  return "Admin service unavailable. Try again soon.";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function sendJson<T>(
  path: string,
  options: {
    body?: Record<string, unknown>;
    fetcher?: Fetcher;
    method: "DELETE" | "GET" | "POST";
  }
): Promise<AdminApiResult<T>> {
  const response = await (options.fetcher ?? fetch)(path, {
    ...(options.body
      ? {
          body: JSON.stringify(options.body),
          headers: { "content-type": "application/json" },
        }
      : {}),
    credentials: "include",
    method: options.method,
  });
  const payload = await readJson(response);

  if (!response.ok) {
    return {
      message: safeAdminAuthMessage(response.status),
      ok: false,
      status: response.status,
    };
  }

  return {
    data: (payload as ApiSuccess<T>).data,
    ok: true,
    status: response.status,
  };
}

export function createAdminSession(
  input: { email: string; password: string },
  fetcher?: Fetcher
): Promise<AdminApiResult<AdminSessionData>> {
  return sendJson<AdminSessionData>("/api/admin/auth/sessions", {
    body: input,
    fetcher,
    method: "POST",
  });
}

export function deleteCurrentAdminSession(
  fetcher?: Fetcher
): Promise<AdminApiResult<{ cleared: boolean; revoked: boolean }>> {
  return sendJson<{ cleared: boolean; revoked: boolean }>(
    "/api/admin/auth/sessions/current",
    { fetcher, method: "DELETE" }
  );
}

export function getCurrentAdminSession(
  fetcher?: Fetcher
): Promise<AdminApiResult<AdminSessionInspection>> {
  return sendJson<AdminSessionInspection>("/api/admin/auth/session", {
    fetcher,
    method: "GET",
  });
}

export function requestAdminPasswordReset(
  input: { email: string },
  fetcher?: Fetcher
): Promise<AdminApiResult<{ accepted: boolean }>> {
  return sendJson<{ accepted: boolean }>("/api/admin/auth/password-resets", {
    body: input,
    fetcher,
    method: "POST",
  });
}

export function confirmAdminPasswordReset(
  input: { password: string; token: string },
  fetcher?: Fetcher
): Promise<AdminApiResult<{ reset: boolean }>> {
  return sendJson<{ reset: boolean }>(
    "/api/admin/auth/password-resets/confirmations",
    {
      body: input,
      fetcher,
      method: "POST",
    }
  );
}
