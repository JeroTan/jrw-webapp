import { describe, expect, it } from "vitest";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import { AuthController, type AuthCookieInstruction } from "./AuthController";
import type { AuthService } from "@/server/services/AuthService";

function createServiceStub(methods: Partial<AuthService>): AuthService {
  return methods as AuthService;
}

describe("AuthController", () => {
  it("maps sign-in success to public envelope and cookie instruction", async () => {
    const controller = new AuthController(
      createServiceStub({
        signIn: async () =>
          Result.okay({
            actor: {
              id: "admin_1",
              role: "SUPER_ADMIN",
              accountStatus: {
                status: "ACTIVE",
                emailVerified: true,
                approved: true,
              },
            },
            session: {
              token: "raw-session-token",
              expiresAt: "2026-05-14T00:00:00.000Z",
            },
          }),
      })
    );

    const result = await controller.createSession({
      body: {
        email: "owner@example.test",
        password: "correct horse battery staple",
      },
      requestId: "req_test",
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      data: {
        actor: {
          id: "admin_1",
          role: "SUPER_ADMIN",
          accountStatus: {
            status: "ACTIVE",
            emailVerified: true,
            approved: true,
          },
        },
        session: {
          expiresAt: "2026-05-14T00:00:00.000Z",
        },
      },
      meta: { code: "SUCCESS", requestId: "req_test" },
    });
    expect(result.cookie).toEqual({
      kind: "set",
      token: "raw-session-token",
      expiresAt: "2026-05-14T00:00:00.000Z",
    } satisfies AuthCookieInstruction);
    expect(JSON.stringify(result.body)).not.toContain("raw-session-token");
  });

  it("maps authentication failure to safe public error", async () => {
    const controller = new AuthController(
      createServiceStub({
        signIn: async () =>
          Result.error(new GeneralError({}, "AUTHENTICATION")),
      })
    );

    const result = await controller.createSession({
      body: {
        email: "missing@example.test",
        password: "wrong password",
      },
      requestId: "req_test",
    });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({
      error: {
        code: "AUTHENTICATION",
        message: "Authentication failed.",
        details: { requestId: "req_test" },
      },
    });
    expect(result.cookie).toBeUndefined();
  });

  it("includes safe service error reason details", async () => {
    const controller = new AuthController(
      createServiceStub({
        signIn: async () =>
          Result.error(
            new GeneralError(
              {
                reason: "auth_storage_unavailable",
                operation: "sign-in",
              },
              "PROVIDER_UNAVAILABLE"
            )
          ),
      })
    );

    const result = await controller.createSession({
      body: {
        email: "owner@example.test",
        password: "correct horse battery staple",
      },
      requestId: "req_test",
    });

    expect(result.status).toBe(503);
    expect(result.body).toEqual({
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "A required provider is unavailable. Please try again later.",
        details: {
          reason: "auth_storage_unavailable",
          operation: "sign-in",
          requestId: "req_test",
        },
      },
    });
  });

  it("always asks transport to clear cookie on sign-out", async () => {
    const controller = new AuthController(
      createServiceStub({
        signOut: async () => Result.okay({ cleared: true, revoked: false }),
      })
    );

    const result = await controller.deleteCurrentSession({
      sessionToken: undefined,
      requestId: "req_test",
    });

    expect(result.status).toBe(200);
    expect(result.cookie).toEqual({ kind: "clear" });
    expect(result.body).toEqual({
      data: { cleared: true, revoked: false },
      meta: { code: "SUCCESS", requestId: "req_test" },
    });
  });
});
