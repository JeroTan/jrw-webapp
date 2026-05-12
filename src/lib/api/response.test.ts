import { describe, expect, it } from "vitest";
import { GeneralError } from "@/utils/general/error";
import { Result } from "@/utils/general/result";
import {
  REDACTED_API_ERROR_DETAIL,
  apiErrorWithRequestId,
  resultToApiResponse,
} from "./response";

describe("API response helpers", () => {
  it("redacts unsafe public error details while preserving request ID", () => {
    const response = apiErrorWithRequestId(
      "PROVIDER_UNAVAILABLE",
      "A required provider is unavailable. Please try again later.",
      "req_public_detail",
      {
        providerPayload: {
          secret: "sk_test_raw",
        },
        safeCode: "PAYMENT_RETRYABLE",
        nested: {
          jwtValue: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
        },
        error: new Error("database password leaked"),
      },
    );

    expect(response.error.details).toMatchObject({
      requestId: "req_public_detail",
      providerPayload: REDACTED_API_ERROR_DETAIL,
      safeCode: "PAYMENT_RETRYABLE",
      nested: {
        jwtValue: REDACTED_API_ERROR_DETAIL,
      },
      error: {
        name: "Error",
        message: REDACTED_API_ERROR_DETAIL,
        stack: REDACTED_API_ERROR_DETAIL,
      },
    });
    expect(JSON.stringify(response)).not.toContain("sk_test_raw");
    expect(JSON.stringify(response)).not.toContain("database password");
  });

  it("propagates request ID through the AppResult adapter", () => {
    const success = resultToApiResponse(Result.okay({ ok: true }), {
      requestId: "req_result",
      meta: { code: "SUCCESS" },
    });
    const failure = resultToApiResponse(
      Result.error(new GeneralError({ password: "raw-password" }, "CONFLICT_STATE")),
      {
        requestId: "req_result",
        exposeErrorDetails: true,
      },
    );

    expect(success).toMatchObject({
      data: { ok: true },
      meta: {
        code: "SUCCESS",
        requestId: "req_result",
      },
    });
    expect(failure).toMatchObject({
      error: {
        code: "CONFLICT_STATE",
        details: {
          requestId: "req_result",
          password: REDACTED_API_ERROR_DETAIL,
        },
      },
    });
    expect(JSON.stringify(failure)).not.toContain("raw-password");
  });
});
