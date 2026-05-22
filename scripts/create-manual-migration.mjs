import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const name = args.find((arg) => !arg.startsWith("--"));

function usage() {
  console.error("Usage: npm run db:migration:manual -- <name> [--dry-run]");
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

if (!name) {
  usage();
  process.exit(1);
}

const slug = slugify(name);
if (!slug) {
  console.error("Migration name must contain at least one letter or number.");
  process.exit(1);
}

const migrationsDir = join(process.cwd(), "migrations");
const entries = await readdir(migrationsDir);
const nextIndex =
  Math.max(
    -1,
    ...entries
      .map((entry) => entry.match(/^(\d{4})_.*\.sql$/)?.[1])
      .filter(Boolean)
      .map((value) => Number(value))
  ) + 1;
const fileName = `${String(nextIndex).padStart(4, "0")}_${slug}.sql`;
const filePath = join(migrationsDir, fileName);
const body = [
  `-- Manual migration: ${slug}`,
  "-- Reason:",
  "-- SQL review:",
  "",
].join("\n");

if (dryRun) {
  console.log(filePath);
} else {
  await writeFile(filePath, body, { flag: "wx" });
  console.log(filePath);
}
