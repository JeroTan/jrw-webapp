import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  apiSuccessWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type {
  AuthenticatedActor,
  AuthService,
  SessionInspectionResult,
  SignOutResult,
} from "@/server/services/AuthService";
import type { AppResult } from "@/utils/general/result";

export type AuthCookieInstruction =
  | {
      kind: "set";
      token: string;
      expiresAt: string;
    }
  | {
      kind: "clear";
    };

export type PublicSignInData = {
  actor: AuthenticatedActor;
  session: {
    expiresAt: string;
  };
};

export type AuthControllerResult<T> = {
  status: number;
  body: ApiResponse<T>;
  cookie?: AuthCookieInstruction;
};

export type CreateSessionControllerInput = {
  body: {
    email: string;
    password: string;
  };
  requestId: string;
  sourceIpHash?: string;
};

export type DeleteCurrentSessionControllerInput = {
  sessionToken?: string;
  requestId: string;
};

export type GetCurrentSessionControllerInput = {
  sessionToken?: string;
  requestId: string;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): AuthControllerResult<T> {
  if (!result.error) {
    throw new Error("Expected error result.");
  }

  const details =
    typeof result.error.data === "object" &&
    result.error.data !== null &&
    Object.keys(result.error.data).length > 0
      ? result.error.data
      : undefined;

  return {
    status: errorCodeToHttpStatus(result.error.code),
    body: apiErrorWithRequestId(
      result.error.code,
      publicErrorMessage(result.error.code, result.error.message),
      requestId,
      details
    ),
  };
}

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async createSession(
    input: CreateSessionControllerInput
  ): Promise<AuthControllerResult<PublicSignInData>> {
    const result = await this.authService.signIn({
      email: input.body.email,
      password: input.body.password,
      requestId: input.requestId,
      sourceIpHash: input.sourceIpHash,
    });

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(
        {
          actor: result.content.actor,
          session: {
            expiresAt: result.content.session.expiresAt,
          },
        },
        input.requestId,
        { code: "SUCCESS" }
      ),
      cookie: {
        kind: "set",
        token: result.content.session.token,
        expiresAt: result.content.session.expiresAt,
      },
    };
  }

  async deleteCurrentSession(
    input: DeleteCurrentSessionControllerInput
  ): Promise<AuthControllerResult<SignOutResult>> {
    const result = await this.authService.signOut({
      sessionToken: input.sessionToken,
      requestId: input.requestId,
    });

    if (result.error) {
      return {
        ...errorResult<SignOutResult>(result, input.requestId),
        cookie: { kind: "clear" },
      };
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
      cookie: {
        kind: "clear",
      },
    };
  }

  async getCurrentSession(
    input: GetCurrentSessionControllerInput
  ): Promise<AuthControllerResult<SessionInspectionResult>> {
    const result = await this.authService.inspectSession({
      sessionToken: input.sessionToken,
      requestId: input.requestId,
    });

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 200,
      body: apiSuccessWithRequestId(result.content, input.requestId, {
        code: "SUCCESS",
      }),
    };
  }
}
