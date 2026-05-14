import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createId } from "@paralleldrive/cuid2";
import {
  buildOwnerCountSql,
  buildSeededOwnerCountSql,
  buildSuperAdminSeedSql,
  decideSuperAdminSeedOperation,
  maskEmailForOperator,
  validatePasswordPepper,
  validateSuperAdminSeedCredentials,
} from "../src/domain/auth/super-admin-seed";
import { hashPassword } from "../src/lib/crypto/password";

type CliOptions = {
  targetEnv?: string;
  replaceOwnerCredentialsConfirmation?: string;
  productionSeedConfirmation?: string;
  dryRun: boolean;
  remoteValidate: boolean;
};

type CliEnv = NodeJS.ProcessEnv &
  Partial<
    Record<
      | "SEED_SUPER_ADMIN_EMAIL"
      | "SEED_SUPER_ADMIN_PASSWORD"
      | "SEED_SUPER_ADMIN_TARGET_ENV"
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

    if (arg.startsWith("--replace-owner-credentials=")) {
      options.replaceOwnerCredentialsConfirmation = readInlineFlagValue(
        arg,
        "--replace-owner-credentials=",
        "--replace-owner-credentials"
      );
      continue;
    }

    if (arg === "--replace-owner-credentials") {
      options.replaceOwnerCredentialsConfirmation = readRequiredFlagValue(
        args,
        index,
        "--replace-owner-credentials"
      );
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
  const email = cleanOptionalEnvValue(env.SEED_SUPER_ADMIN_EMAIL);
  const password = env.SEED_SUPER_ADMIN_PASSWORD;
  const targetEnv =
    cli.targetEnv ??
    cleanOptionalEnvValue(env.SEED_SUPER_ADMIN_TARGET_ENV) ??
    "development";

  const credentials = validateSuperAdminSeedCredentials({
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
  console.log(`Seed email: ${maskEmailForOperator(credentials.email)}`);

  const replaceOwnerCredentialsConfirmation =
    cli.replaceOwnerCredentialsConfirmation;
  const productionSeedConfirmation = cli.productionSeedConfirmation;
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

  if (cli.dryRun && !cli.remoteValidate) {
    console.log(
      "Dry run: credentials and target gate validated. No remote D1 query or seed SQL executed."
    );
    return;
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
      `Remote dry run: ${decision.operation} validated. No seed SQL executed.`
    );
    return;
  }

  const { passwordHash, passwordSalt } = await hashPassword(
    credentials.password,
    pepper.pepper
  );
  const sql = buildSuperAdminSeedSql({
    id: createId(),
    email: credentials.email,
    passwordHash,
    passwordSalt,
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
    const finalOwnerCountOutput = runWranglerD1(targetEnv, [
      "--command",
      buildOwnerCountSql(),
      "--json",
    ]);
    const finalOwnerCount = parseOwnerCount(finalOwnerCountOutput);
    const seededOwnerCountOutput = runWranglerD1(targetEnv, [
      "--command",
      buildSeededOwnerCountSql(credentials.email),
      "--json",
    ]);
    const seededOwnerCount = parseOwnerCount(seededOwnerCountOutput);

    if (finalOwnerCount !== 1 || seededOwnerCount !== 1) {
      throw new Error(
        "Super Admin seed verification failed. Expected exactly one owner matching the seed email."
      );
    }

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
