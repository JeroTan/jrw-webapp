const SQLITE_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

export function toApiDateTime(value: string): string {
  const trimmed = value.trim();
  const candidate = SQLITE_TIMESTAMP.test(trimmed)
    ? `${trimmed.replace(" ", "T")}Z`
    : trimmed;
  const date = new Date(candidate);

  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function toNullableApiDateTime(value: string | null): string | null {
  return value === null ? null : toApiDateTime(value);
}
