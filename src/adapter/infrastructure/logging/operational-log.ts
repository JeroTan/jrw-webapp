import type { ErrorCodeType } from "@/utils/general/error";

export const REDACTED_LOG_VALUE = "[REDACTED]";

export type OperationalActorRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CUSTOMER"
  | "PROSPECT"
  | "SYSTEM"
  | "UNKNOWN";

export type OperationalLogDetails = Record<string, unknown>;

export type OperationalLogEvent = {
  requestId: string;
  timestamp: string;
  actorRole?: OperationalActorRole;
  safeActorId?: string;
  targetResourceId?: string;
  errorCode?: ErrorCodeType;
  details?: OperationalLogDetails;
};

export type CreateOperationalLogEventInput = Omit<OperationalLogEvent, "timestamp" | "details"> & {
  timestamp?: string;
  details?: OperationalLogDetails;
};

export type OperationalLogger = {
  record(event: OperationalLogEvent): void;
};

const sensitiveKeyPatterns = [
  /password/i,
  /passphrase/i,
  /hash/i,
  /jwt/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /authorization/i,
  /paymongo/i,
  /payment.*payload/i,
  /raw.*payment/i,
  /card/i,
  /pepper/i,
  /stack/i,
  /phone/i,
  /address/i,
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function shouldRedactKey(key: string): boolean {
  return sensitiveKeyPatterns.some((pattern) => pattern.test(key));
}

function shouldRedactString(value: string): boolean {
  return /^Bearer\s+/i.test(value) || /^sk_(test|live)_/i.test(value);
}

function scrubValue(value: unknown, key = ""): unknown {
  if (key && shouldRedactKey(key)) {
    return REDACTED_LOG_VALUE;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: REDACTED_LOG_VALUE,
      stack: REDACTED_LOG_VALUE,
    };
  }

  if (typeof value === "string") {
    return shouldRedactString(value) ? REDACTED_LOG_VALUE : value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => scrubValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        scrubValue(entryValue, entryKey),
      ]),
    );
  }

  return value;
}

export function scrubLogDetails(details?: OperationalLogDetails): OperationalLogDetails | undefined {
  if (!details) return undefined;

  return scrubValue(details) as OperationalLogDetails;
}

export function createOperationalLogEvent(
  input: CreateOperationalLogEventInput,
): OperationalLogEvent {
  return {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
    details: scrubLogDetails(input.details),
  };
}

export const noopOperationalLogger: OperationalLogger = {
  record: () => undefined,
};

export const consoleOperationalLogger: OperationalLogger = {
  record: (event) => {
    console.error(JSON.stringify(event));
  },
};

export function shouldLogOperationalFailure(code: ErrorCodeType): boolean {
  return (
    code === "INTERNAL_ERROR" ||
    code === "INTERNAL_SERVER_ERROR" ||
    code === "PROVIDER_UNAVAILABLE"
  );
}
