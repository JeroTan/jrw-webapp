import type { z, ZodError } from "zod";

export type FORMATTED_ZOD_ERROR = Record<string, string>;
export type ZOD_ERROR_ISSUE = {
  path: Array<string | number>;
  message: string;
};

export function simplifierZodError(error: string | ZodError) {
  let issues: ZOD_ERROR_ISSUE[] = [];
  try {
    if (typeof error === "string") {
      issues = JSON.parse(error);
    } else {
      issues = JSON.parse(error.message);
    }
    if (!Array.isArray(issues)) {
      return { _: error.toString() };
    }
  } catch {
    return { _: error.toString() };
  }

  const result: Record<string, string> = {};

  for (const issue of issues) {
    const key =
      issue.path && issue.path.length > 0
        ? issue.path.map((p: string | number) => String(p)).join(".")
        : "_";

    if (!result[key]) {
      result[key] = issue.message;
    }
  }

  return result;
}
