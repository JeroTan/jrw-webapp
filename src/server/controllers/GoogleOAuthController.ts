import { errorCodeToHttpStatus, publicErrorMessage } from "@/lib/api/errors";
import {
  apiErrorWithRequestId,
  type ApiResponse,
} from "@/lib/api/response";
import type { SessionCookieInstruction } from "@/server/auth/session-cookie";
import type {
  GoogleOAuthService,
  GoogleOAuthSessionResult,
  GoogleOAuthStartResult,
  HandleGoogleOAuthCallbackInput,
  StartGoogleOAuthInput,
} from "@/server/services/GoogleOAuthService";
import type { AppResult } from "@/utils/general/result";

export type GoogleOAuthServiceLike = Pick<
  GoogleOAuthService,
  "startSession" | "handleCallback"
>;

export type GoogleOAuthControllerResult<T> = {
  status: number;
  body?: ApiResponse<T>;
  location?: string;
  cookie?: SessionCookieInstruction;
};

function errorResult<T>(
  result: AppResult<unknown>,
  requestId: string
): GoogleOAuthControllerResult<T> {
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

export class GoogleOAuthController {
  constructor(private readonly googleOAuthService: GoogleOAuthServiceLike) {}

  async startSession(
    input: StartGoogleOAuthInput
  ): Promise<GoogleOAuthControllerResult<GoogleOAuthStartResult>> {
    const result = await this.googleOAuthService.startSession(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 302,
      location: result.content.redirectUrl,
    };
  }

  async handleCallback(
    input: HandleGoogleOAuthCallbackInput
  ): Promise<GoogleOAuthControllerResult<GoogleOAuthSessionResult>> {
    const result = await this.googleOAuthService.handleCallback(input);

    if (result.error) {
      return errorResult(result, input.requestId);
    }

    return {
      status: 302,
      location: result.content.redirectPath,
      cookie: {
        kind: "set",
        token: result.content.session.token,
        expiresAt: result.content.session.expiresAt,
      },
    };
  }
}
