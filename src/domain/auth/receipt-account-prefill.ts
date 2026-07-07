import { jwtDecrypt, jwtEncrypt } from "@/lib/crypto/jwt";

export const RECEIPT_ACCOUNT_PREFILL_PURPOSE = "receipt-account-prefill";
export const RECEIPT_ACCOUNT_PREFILL_TTL_SECONDS = 60 * 60 * 24;

export type ReceiptAccountPrefillPayload = {
  attemptId: string;
  paymentId: string;
  purpose: typeof RECEIPT_ACCOUNT_PREFILL_PURPOSE;
};

function cleanContextId(value: unknown): string | null {
  return typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 128
    ? value.trim()
    : null;
}

export function isReceiptAccountPrefillPayload(
  value: unknown
): value is ReceiptAccountPrefillPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ReceiptAccountPrefillPayload>;

  return (
    candidate.purpose === RECEIPT_ACCOUNT_PREFILL_PURPOSE &&
    cleanContextId(candidate.attemptId) !== null &&
    cleanContextId(candidate.paymentId) !== null
  );
}

export async function createReceiptAccountPrefillToken(input: {
  attemptId: string;
  paymentId: string;
  secretKey: string;
  ttlSeconds?: number;
}): Promise<string | null> {
  const attemptId = cleanContextId(input.attemptId);
  const paymentId = cleanContextId(input.paymentId);

  if (!attemptId || !paymentId || input.secretKey.trim().length === 0) {
    return null;
  }

  const result = await jwtEncrypt({
    expiresInSeconds:
      input.ttlSeconds ?? RECEIPT_ACCOUNT_PREFILL_TTL_SECONDS,
    payload: {
      attemptId,
      paymentId,
      purpose: RECEIPT_ACCOUNT_PREFILL_PURPOSE,
    },
    secretKey: input.secretKey,
  });

  return result.data;
}

export async function parseReceiptAccountPrefillToken(input: {
  secretKey: string;
  token: string;
}): Promise<ReceiptAccountPrefillPayload | null> {
  if (input.token.trim().length === 0 || input.secretKey.trim().length === 0) {
    return null;
  }

  const result = await jwtDecrypt<ReceiptAccountPrefillPayload>({
    secretKey: input.secretKey,
    token: input.token,
  });

  return result.data && isReceiptAccountPrefillPayload(result.data)
    ? result.data
    : null;
}
