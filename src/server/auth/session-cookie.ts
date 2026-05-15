export const SESSION_COOKIE_NAME = "jrw_session";

export type SessionCookieInstruction =
  | {
      kind: "set";
      token: string;
      expiresAt: string;
    }
  | {
      kind: "clear";
    };

export type SessionCookieJar = Record<
  string,
  {
    value?: unknown;
    set?: (config: Record<string, unknown>) => unknown;
  }
>;

export function getSessionCookieValue(
  cookie: SessionCookieJar
): string | undefined {
  const value = cookie[SESSION_COOKIE_NAME]?.value;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function shouldSecureCookie(request: Request): boolean {
  const url = new URL(request.url);
  const localHostnames = new Set(["localhost", "127.0.0.1", "::1"]);

  return !(url.protocol === "http:" && localHostnames.has(url.hostname));
}

function secondsUntil(expiresAt: string, now = new Date()): number {
  return Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000)
  );
}

export function applySessionCookieInstruction(
  cookie: SessionCookieJar,
  request: Request,
  instruction: SessionCookieInstruction | undefined
): void {
  if (!instruction) return;

  const sessionCookie = cookie[SESSION_COOKIE_NAME];
  if (!sessionCookie?.set) return;

  const baseCookie = {
    httpOnly: true,
    secure: shouldSecureCookie(request),
    sameSite: "lax",
    path: "/",
  };

  if (instruction.kind === "set") {
    sessionCookie.set({
      ...baseCookie,
      value: instruction.token,
      expires: new Date(instruction.expiresAt),
      maxAge: secondsUntil(instruction.expiresAt),
    });
    return;
  }

  sessionCookie.set({
    ...baseCookie,
    value: "",
    expires: new Date(0),
    maxAge: 0,
  });
}
