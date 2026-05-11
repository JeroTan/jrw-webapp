import type { ZodType } from "zod";
import { GeneralError } from "@/utils/general/error";
import { Result, type AppResult } from "@/utils/general/result";

export type ZodValidationSummary =
  | { error: true; message: string[] }
  | { error: false; message: undefined };

export function zodValidateSchema<T>(input: T, schema: ZodType): ZodValidationSummary {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return { error: false, message: undefined };
  }
  const messages: string[] = [];
  parsed.error.issues.forEach((err) => {
    if (err.message) {
      messages.push(err.message);
    }
  });
  return { error: true, message: messages };
}

export function zodParseResult<T>(input: unknown, schema: ZodType<T>): AppResult<T, string[]> {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return Result.okay(parsed.data);
  }

  return Result.error(
    new GeneralError(
      parsed.error.issues.map((issue) => issue.message),
      "VALIDATION",
    ),
  );
}
