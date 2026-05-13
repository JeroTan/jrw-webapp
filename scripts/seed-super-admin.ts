import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createId } from "@paralleldrive/cuid2";
import {
  buildOwnerCountSql,
  buildSuperAdminSeedSql,
  decideSuperAdminSeedOperation,
  maskEmailForOperator,
  validateSuperAdminSeedCredentials,
} from "../src/domain/auth/super-admin-seed";
import { hash } from "../src/lib/crypto/hash";

type CliOptions = {
  targetEnv?: string;
  replaceOwnerCredentialsConfirmation?: string;
  productionSeedConfirmation?: string;
  dryRun: boolean;
};

type CliEnv = NodeJS.ProcessEnv &
  Partial<
    Record<
      | "SEED_SUPER_ADMIN_EMAIL"
      | "SEED_SUPER_ADMIN_PASSWORD"
      | "SEED_SUPER_ADMIN_TARGET_ENV"
      | "SEED_SUPER_ADMIN_REPLACE_OWNER_CONFIRMATION"
      | "SEED_SUPER_ADMIN_PRODUCTION_CONFIRMATION",
      string
    >
  >;

function cleanEnv(value: string | undefined): string | undefined {
  return value?.trim().replace(/;$/, "").replace(/^"/, "").replace(/"$/, "");
}

function readFlagValue(args: string[], index: number): string | undefined {
  const value = args[index + 1];
  return value && !value.startsWith("--") ? value : undefined;
}

function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--env=")) {
      options.targetEnv = arg.slice("--env=".length);
      continue;
    }

    if (arg === "--env") {
      options.targetEnv = readFlagValue(args, index);
      index += options.targetEnv ? 1 : 0;
      continue;
    }

    if (arg.startsWith("--replace-owner-credentials=")) {
      options.replaceOwnerCredentialsConfirmation = arg.slice(
        "--replace-owner-credentials=".length
      );
      continue;
    }

    if (arg === "--replace-owner-credentials") {
      options.replaceOwnerCredentialsConfirmation = readFlagValue(args, index);
      index += options.replaceOwnerCredentialsConfirmation ? 1 : 0;
      continue;
    }

    if (arg.startsWith("--production-reviewed=")) {
      options.productionSeedConfirmation = arg.slice(
        "--production-reviewed=".length
      );
      continue;
    }

    if (arg === "--production-reviewed") {
      options.productionSeedConfirmation = readFlagValue(args, index);
      index += options.productionSeedConfirmation ? 1 : 0;
    }
  }

  return options;
}

function npxExecutable(): string {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function runWranglerD1(targetEnv: string, args: readonly string[]): string {
  return execFileSync(
    npxExecutable(),
    [
      "wrangler@latest",
      "d1",
      "execute",
      "DB",
      "--remote",
      "--env",
      targetEnv,
      ...args,
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findOwnerCount(value: unknown): number | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const ownerCount = findOwnerCount(item);
      if (ownerCount !== undefined) return ownerCount;
    }

    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const ownerCount = value.owner_count;

  if (typeof ownerCount === "number") {
    return ownerCount;
  }

  if (typeof ownerCount === "string" && /^\d+$/.test(ownerCount)) {
    return Number(ownerCount);
  }

  for (const item of Object.values(value)) {
    const nestedOwnerCount = findOwnerCount(item);
    if (nestedOwnerCount !== undefined) return nestedOwnerCount;
  }

  return undefined;
}

function parseOwnerCount(output: string): number {
  try {
    const parsed = JSON.parse(output) as unknown;
    const ownerCount = findOwnerCount(parsed);
    if (ownerCount !== undefined) return ownerCount;
  } catch {
    const match = output.match(/owner_count[^\d]+(\d+)/i);
    if (match?.[1]) return Number(match[1]);
  }

  throw new Error("Cannot read owner count from Wrangler output.");
}

export async function main(
  args = process.argv.slice(2),
  env: CliEnv = process.env
): Promise<void> {
  const cli = parseCliArgs(args);
  const email = cleanEnv(env.SEED_SUPER_ADMIN_EMAIL);
  const password = cleanEnv(env.SEED_SUPER_ADMIN_PASSWORD);
  const targetEnv =
    cli.targetEnv ?? cleanEnv(env.SEED_SUPER_ADMIN_TARGET_ENV) ?? "development";

  const credentials = validateSuperAdminSeedCredentials({
    email,
    password,
  });

  if (!credentials.ok) {
    console.error(credentials.message);
    process.exit(1);
  }

  console.log(`Target environment: ${targetEnv}`);
  console.log(`Seed email: ${maskEmailForOperator(credentials.email)}`);

  const replaceOwnerCredentialsConfirmation =
    cli.replaceOwnerCredentialsConfirmation ??
    cleanEnv(env.SEED_SUPER_ADMIN_REPLACE_OWNER_CONFIRMATION);
  const productionSeedConfirmation =
    cli.productionSeedConfirmation ??
    cleanEnv(env.SEED_SUPER_ADMIN_PRODUCTION_CONFIRMATION);
  const targetGate = decideSuperAdminSeedOperation({
    ownerCount: 0,
    targetEnv,
    productionSeedConfirmation,
  });

  if (
    !targetGate.ok &&
    (targetGate.reason === "INVALID_TARGET_ENV" ||
      targetGate.reason === "PRODUCTION_REVIEW_REQUIRED")
  ) {
    console.error(targetGate.message);
    process.exit(1);
  }

  const ownerCountOutput = runWranglerD1(targetEnv, [
    "--command",
    buildOwnerCountSql(),
    "--json",
  ]);
  const ownerCount = parseOwnerCount(ownerCountOutput);

  console.log(`Current owner count: ${ownerCount}`);

  const decision = decideSuperAdminSeedOperation({
    ownerCount,
    targetEnv,
    replaceOwnerCredentialsConfirmation,
    productionSeedConfirmation,
  });

  if (!decision.ok) {
    console.error(decision.message);
    process.exit(1);
  }

  for (const warning of decision.warnings) {
    console.warn(warning);
  }

  if (cli.dryRun) {
    console.log(
      `Dry run: ${decision.operation} validated. No seed SQL executed.`
    );
    return;
  }

  const passwordHash = await hash(credentials.password);
  const sql = buildSuperAdminSeedSql({
    id: createId(),
    email: credentials.email,
    passwordHash,
    operation: decision.operation,
  });

  const tempDir = mkdtempSync(join(tmpdir(), "jrw-seed-super-admin-"));
  const tempFile = join(tempDir, "seed-super-admin.sql");

  try {
    writeFileSync(tempFile, sql, {
      encoding: "utf8",
      mode: 0o600,
    });

    runWranglerD1(targetEnv, ["--file", tempFile, "--yes"]);
    console.log(`Super Admin seed completed: ${decision.operation}`);
  } finally {
    rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

export function reportSeedError(error: unknown): never {
  const message =
    error instanceof Error ? error.message : "Unknown seed failure.";
  console.error(message);
  process.exit(1);
}

const mainModulePath = process.argv[1] ? resolve(process.argv[1]) : "";
const currentModulePath = fileURLToPath(import.meta.url);

if (mainModulePath === currentModulePath) {
  main().catch(reportSeedError);
}
