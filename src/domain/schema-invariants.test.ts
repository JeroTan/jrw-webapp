import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { admins } from "./schema/identity";

function getColumnName(column: unknown): string | undefined {
  if (typeof column !== "object" || column === null || !("name" in column)) {
    return undefined;
  }

  const name = column.name;
  return typeof name === "string" ? name : undefined;
}

describe("identity schema invariants", () => {
  it("enforces a single owner admin with a unique partial index", () => {
    const adminConfig = getTableConfig(admins);
    const ownerIndex = adminConfig.indexes.find(
      (index) => index.config.name === "admins_single_owner_idx"
    );

    expect(ownerIndex?.config.unique).toBe(true);
    expect(
      ownerIndex?.config.columns.map((column) => getColumnName(column))
    ).toEqual(["is_owner"]);
    expect(ownerIndex?.config.where).toBeDefined();
  });
});
