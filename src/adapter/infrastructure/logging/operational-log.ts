import type { ActorRole } from "@/domain/auth/roles";
import { GeneralError, type ErrorCodeType } from "@/utils/general/error";

export const REDACTED_LOG_VALUE = "[REDACTED]";

export type OperationalActorRole = ActorRole;

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

export type CreateOperationalLogEventInput = Omit<
  OperationalLogEvent,
  "timestamp" | "details"
> & {
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
  /signature/i,
  /session/i,
  /email/i,
  /paymongo/i,
  /provider.*payload/i,
  /raw.*provider/i,
  /provider.*response/i,
  /payment.*payload/i,
  /payment.*response/i,
  /raw.*payment/i,
  /raw.*payload/i,
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
  return (
    /^Bearer\s+/i.test(value) ||
    /^(sk|pk)_(test|live)_/i.test(value) ||
    /^ya29\./i.test(value) ||
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value) ||
    /\b(password|secret|token|jwt|cookie|paymongo|raw payment|provider payload|stack)\b/i.test(
      value
    )
  );
}

function scrubValue(
  value: unknown,
  key = "",
  seen = new WeakSet<object>()
): unknown {
  if (key && shouldRedactKey(key)) {
    return REDACTED_LOG_VALUE;
  }

  if (value instanceof GeneralError) {
    return {
      name: value.constructor.name,
      code: value.code,
      message: REDACTED_LOG_VALUE,
      data: REDACTED_LOG_VALUE,
    };
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

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return REDACTED_LOG_VALUE;
    }

    seen.add(value);
    return value.map((item) => scrubValue(item, "", seen));
  }

  if (isRecord(value)) {
    if (seen.has(value)) {
      return REDACTED_LOG_VALUE;
    }

    seen.add(value);
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        scrubValue(entryValue, entryKey, seen),
      ])
    );
  }

  return value;
}

export function scrubLogDetails(
  details?: OperationalLogDetails
): OperationalLogDetails | undefined {
  if (!details) return undefined;

  return scrubValue(details) as OperationalLogDetails;
}

export function createOperationalLogEvent(
  input: CreateOperationalLogEventInput
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

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();

  return JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") {
      return item.toString();
    }

    if (typeof item === "object" && item !== null) {
      if (seen.has(item)) {
        return REDACTED_LOG_VALUE;
      }

      seen.add(item);
    }

    return item;
  });
}

export const consoleOperationalLogger: OperationalLogger = {
  record: (event) => {
    console.error(safeStringify(event));
  },
};

export function shouldLogOperationalFailure(code: ErrorCodeType): boolean {
  return (
    code === "INTERNAL_ERROR" ||
    code === "INTERNAL_SERVER_ERROR" ||
    code === "PROVIDER_UNAVAILABLE"
  );
}
