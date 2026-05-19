import { describe, expect, it } from "vitest";
import { toApiDateTime, toNullableApiDateTime } from "./date-time";

describe("API date-time normalization", () => {
  it("normalizes SQLite CURRENT_TIMESTAMP strings to RFC3339", () => {
    expect(toApiDateTime("2026-05-17 12:31:00")).toBe(
      "2026-05-17T12:31:00.000Z"
    );
  });

  it("preserves valid ISO date-time strings as canonical ISO", () => {
    expect(toApiDateTime("2026-05-17T12:31:00.000Z")).toBe(
      "2026-05-17T12:31:00.000Z"
    );
  });

  it("passes invalid legacy values through for upstream error handling", () => {
    expect(toApiDateTime("not-a-date")).toBe("not-a-date");
    expect(toNullableApiDateTime(null)).toBeNull();
  });
});
