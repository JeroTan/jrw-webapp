import { hash } from "../src/lib/crypto/hash";
import { createId } from "@paralleldrive/cuid2";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import "dotenv/config";

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL?.replace(/;$/, "").replace(/^"/, "").replace(/"$/, "");
  const password = process.env.SEED_SUPERADMIN_PASSWORD?.replace(/;$/, "").replace(/^"/, "").replace(/"$/, "");

  if (!email || !password) {
    console.error("❌ SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  console.log(`🌱 Generating hash for ${email}...`);
  const passwordHash = await hash(password);
  const id = createId();

  const sql = `INSERT INTO admins (id, email, password_hash, is_owner) VALUES ('${id}', '${email}', '${passwordHash}', 1) ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash, is_owner = 1;`;

  const tempFile = "seed.sql";
  writeFileSync(tempFile, sql);

  console.log("🚀 Executing remote seed from file...");
  execSync(`npx wrangler@latest d1 execute DB --remote --env development --file=${tempFile} --yes`, { stdio: "inherit" });
  console.log("✅ Super-Admin seeded successfully.");
  unlinkSync(tempFile);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
