import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createId } from "@paralleldrive/cuid2";
import {
  buildAdminSeedSql,
  buildSeededAdminCountSql,
  buildSeededOwnerEmailConflictSql,
  decideAdminSeedOperation,
  validateAdminSeedCredentials,
} from "../src/domain/auth/admin-seed";
import {
  maskEmailForOperator,
  validatePasswordPepper,
} from "../src/domain/auth/super-admin-seed";
import { hashPassword } from "../src/lib/crypto/password";

type CliOptions = {
  targetEnv?: string;
  productionSeedConfirmation?: string;
  dryRun: boolean;
  remoteValidate: boolean;
};

type CliEnv = NodeJS.ProcessEnv &
  Partial<
    Record<
      | "SEED_ADMIN_EMAIL"
      | "SEED_ADMIN_PASSWORD"
      | "SEED_ADMIN_TARGET_ENV"
      | "PASSWORD_PEPPER",
      string
    >
  >;

function cleanOptionalEnvValue(value: string | undefined): string | undefined {
  return value?.trim().replace(/;$/, "").replace(/^"/, "").replace(/"$/, "");
}

function readRequiredFlagValue(
  args: string[],
  index: number,
  flagName: string
): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flagName} requires a value.`);
  }

  return value;
}

function readInlineFlagValue(
  arg: string,
  prefix: string,
  flagName: string
): string {
  const value = arg.slice(prefix.length);
  if (!value) {
    throw new Error(`${flagName} requires a value.`);
  }

  return value;
}

function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    remoteValidate: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--remote-validate") {
      options.remoteValidate = true;
      continue;
    }

    if (arg.startsWith("--env=")) {
      options.targetEnv = readInlineFlagValue(arg, "--env=", "--env");
      continue;
    }

    if (arg === "--env") {
      options.targetEnv = readRequiredFlagValue(args, index, "--env");
      index += 1;
      continue;
    }

    if (arg.startsWith("--production-reviewed=")) {
      options.productionSeedConfirmation = readInlineFlagValue(
        arg,
        "--production-reviewed=",
        "--production-reviewed"
      );
      continue;
    }

    if (arg === "--production-reviewed") {
      options.productionSeedConfirmation = readRequiredFlagValue(
        args,
        index,
        "--production-reviewed"
      );
      index += 1;
    }
  }

  return options;
}

function npxInvocation(): { command: string; argsPrefix: string[] } {
  if (process.platform === "win32") {
    return { command: "cmd.exe", argsPrefix: ["/c", "npx"] };
  }

  return { command: "npx", argsPrefix: [] };
}

function runWranglerD1(targetEnv: string, args: readonly string[]): string {
  const npx = npxInvocation();

  return execFileSync(
    npx.command,
    [
      ...npx.argsPrefix,
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
      timeout: 120_000,
    }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findNamedCount(value: unknown, key: string): number | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const count = findNamedCount(item, key);
      if (count !== undefined) return count;
    }

    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const count = value[key];

  if (typeof count === "number") {
    return count;
  }

  if (typeof count === "string" && /^\d+$/.test(count)) {
    return Number(count);
  }

  for (const item of Object.values(value)) {
    const nestedCount = findNamedCount(item, key);
    if (nestedCount !== undefined) return nestedCount;
  }

  return undefined;
}

function parseNamedCount(
  output: string,
  key: "admin_count" | "owner_count"
): number {
  try {
    const parsed = JSON.parse(output) as unknown;
    const count = findNamedCount(parsed, key);
    if (count !== undefined) return count;
  } catch {
    const match = output.match(new RegExp(`${key}[^\\d]+(\\d+)`, "i"));
    if (match?.[1]) return Number(match[1]);
  }

  throw new Error(`Cannot read ${key} from Wrangler output.`);
}

export async function main(
  args = process.argv.slice(2),
  env: CliEnv = process.env
): Promise<void> {
  const cli = parseCliArgs(args);
  const email = cleanOptionalEnvValue(env.SEED_ADMIN_EMAIL);
  const password = env.SEED_ADMIN_PASSWORD;
  const targetEnv =
    cli.targetEnv ??
    cleanOptionalEnvValue(env.SEED_ADMIN_TARGET_ENV) ??
    "development";

  const credentials = validateAdminSeedCredentials({
    email,
    password,
  });
  const pepper = validatePasswordPepper(
    cleanOptionalEnvValue(env.PASSWORD_PEPPER)
  );

  if (!credentials.ok) {
    console.error(credentials.message);
    process.exit(1);
  }

  if (!pepper.ok) {
    console.error(pepper.message);
    process.exit(1);
  }

  console.log(`Target environment: ${targetEnv}`);
  console.log(`Seed admin email: ${maskEmailForOperator(credentials.email)}`);

  const targetGate = decideAdminSeedOperation({
    adminCount: 0,
    ownerEmailConflictCount: 0,
    targetEnv,
    productionSeedConfirmation: cli.productionSeedConfirmation,
  });

  if (
    !targetGate.ok &&
    (targetGate.reason === "INVALID_TARGET_ENV" ||
      targetGate.reason === "PRODUCTION_REVIEW_REQUIRED")
  ) {
    console.error(targetGate.message);
    process.exit(1);
  }

  if (cli.dryRun && !cli.remoteValidate) {
    console.log(
      "Dry run: credentials and target gate validated. No remote D1 query or seed SQL executed."
    );
    return;
  }

  const ownerConflictCount = parseNamedCount(
    runWranglerD1(targetEnv, [
      "--command",
      buildSeededOwnerEmailConflictSql(credentials.email),
      "--json",
    ]),
    "owner_count"
  );
  const adminCount = parseNamedCount(
    runWranglerD1(targetEnv, [
      "--command",
      buildSeededAdminCountSql(credentials.email),
      "--json",
    ]),
    "admin_count"
  );

  const decision = decideAdminSeedOperation({
    adminCount,
    ownerEmailConflictCount: ownerConflictCount,
    targetEnv,
    productionSeedConfirmation: cli.productionSeedConfirmation,
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
      `Remote dry run: ${decision.operation} validated. No seed SQL executed.`
    );
    return;
  }

  const { passwordHash, passwordSalt } = await hashPassword(
    credentials.password,
    pepper.pepper
  );
  const sql = buildAdminSeedSql({
    id: createId(),
    email: credentials.email,
    passwordHash,
    passwordSalt,
  });

  const tempDir = mkdtempSync(join(tmpdir(), "jrw-seed-admin-"));
  const tempFile = join(tempDir, "seed-admin.sql");

  try {
    writeFileSync(tempFile, sql, {
      encoding: "utf8",
      mode: 0o600,
    });

    runWranglerD1(targetEnv, ["--file", tempFile, "--yes"]);
    const finalOwnerConflictCount = parseNamedCount(
      runWranglerD1(targetEnv, [
        "--command",
        buildSeededOwnerEmailConflictSql(credentials.email),
        "--json",
      ]),
      "owner_count"
    );
    const finalAdminCount = parseNamedCount(
      runWranglerD1(targetEnv, [
        "--command",
        buildSeededAdminCountSql(credentials.email),
        "--json",
      ]),
      "admin_count"
    );

    if (finalOwnerConflictCount !== 0 || finalAdminCount !== 1) {
      throw new Error(
        "Admin seed verification failed. Expected exactly one non-owner Admin matching the seed email."
      );
    }

    console.log(`Admin seed completed: ${decision.operation}`);
  } finally {
    rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

export function reportSeedError(error: unknown): never {
  const message =
    error instanceof Error ? error.message : "Unknown admin seed failure.";
  console.error(message);
  process.exit(1);
}

const mainModulePath = process.argv[1] ? resolve(process.argv[1]) : "";
const currentModulePath = fileURLToPath(import.meta.url);

if (mainModulePath === currentModulePath) {
  main().catch(reportSeedError);
}
