import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/domain/schema/*.ts",
  out: "./migrations",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: "8e6c0cd85435131ccf9936cc03cb62e5",
    databaseId: "beabfd98-8611-4d58-8f1b-7a972b8af1ed",
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
