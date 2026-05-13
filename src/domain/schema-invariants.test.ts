import { SQL } from "drizzle-orm";
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

function getSqlQuery(value: unknown): string | undefined {
  if (!(value instanceof SQL)) {
    return undefined;
  }

  return value.toQuery({
    casing: {
      getColumnCasing: (column: { name: string }) => column.name,
    },
    escapeName: (name: string) => `"${name}"`,
    escapeParam: () => "?",
    escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
    invokeSource: "indexes",
  } as never).sql;
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
    ).toEqual([undefined]);
    expect(getSqlQuery(ownerIndex?.config.columns[0])).toBe("1");
    expect(getSqlQuery(ownerIndex?.config.where)).toBe('"is_owner" <> 0');
  });
});
