import { defineConfig } from "astro/config";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

const serverOnlyOptimizeExcludes = [
  "elysia",
  "@elysiajs/openapi",
  "@elysiajs/cors",
  "drizzle-orm",
  "drizzle-orm/d1",
];

const workerServerOptimizeIncludes = [
  "elysia",
  "elysia/adapter/cloudflare-worker",
  "@elysiajs/openapi",
  "@elysiajs/cors",
  "drizzle-orm",
  "drizzle-orm/d1",
  "drizzle-orm/sqlite-core",
  "@paralleldrive/cuid2",
  "resend",
  "svix",
  "postal-mime",
  "showdown",
  "zod",
  "@sinclair/typebox",
];

function optimizeWorkerServerDeps() {
  return {
    name: "optimize-worker-server-deps",
    configEnvironment(environment) {
      if (environment === "client") return;

      return {
        optimizeDeps: {
          include: workerServerOptimizeIncludes,
        },
      };
    },
  };
}

const PAYMONGO_DEV_PROXY_PATH = "/__jrw-dev/paymongo/checkout-sessions";

function cleanEnvString(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];

  return (first === `"` || first === `'`) && first === last
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

function readDotEnvValue(key) {
  try {
    const lines = readFileSync(".env", "utf8").split(/\r?\n/);
    const prefix = `${key}=`;
    const line = lines.find((entry) => entry.trimStart().startsWith(prefix));

    return line ? cleanEnvString(line.slice(line.indexOf("=") + 1)) : undefined;
  } catch {
    return undefined;
  }
}

function payMongoSecretKey() {
  return (
    cleanEnvString(process.env.PAYMONGO_SECRET_KEY) ??
    readDotEnvValue("PAYMONGO_SECRET_KEY")
  );
}

function isLoopbackAddress(address) {
  return (
    address === "127.0.0.1" ||
    address === "::1" ||
    address === "::ffff:127.0.0.1"
  );
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function writeJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function payMongoDevProxy() {
  return {
    name: "paymongo-dev-proxy",
    configureServer(server) {
      server.middlewares.use(PAYMONGO_DEV_PROXY_PATH, async (req, res) => {
        if (req.method !== "POST") {
          writeJson(res, 405, {
            error: {
              code: "VALIDATION_FAILED",
              message: "Method not allowed.",
            },
          });
          return;
        }

        if (!isLoopbackAddress(req.socket.remoteAddress)) {
          writeJson(res, 403, {
            error: {
              code: "AUTH_FORBIDDEN",
              message: "Forbidden.",
            },
          });
          return;
        }

        const secretKey = payMongoSecretKey();

        if (!secretKey) {
          writeJson(res, 503, {
            error: {
              code: "PROVIDER_UNAVAILABLE",
              message: "PayMongo secret is unavailable.",
            },
          });
          return;
        }

        try {
          const body = await readRequestBody(req);
          JSON.parse(body);

          const response = await fetch(
            "https://api.paymongo.com/v2/checkout_sessions",
            {
              body,
              headers: {
                Accept: "application/json",
                Authorization: `Basic ${Buffer.from(
                  `${secretKey}:`,
                  "utf8"
                ).toString("base64")}`,
                "Content-Type": "application/json",
              },
              method: "POST",
            }
          );
          const text = await response.text();

          res.statusCode = response.status;
          res.setHeader("Cache-Control", "no-store");
          res.setHeader(
            "Content-Type",
            response.headers.get("Content-Type") ??
              "application/json; charset=utf-8"
          );
          res.end(text);
        } catch {
          writeJson(res, 503, {
            error: {
              code: "PROVIDER_UNAVAILABLE",
              message: "Payment provider request failed.",
            },
          });
        }
      });
    },
  };
}

// https://astro.build/config
export default defineConfig({
  output: "server",
  server: {
    port: 7777,
    host: true,
  },
  devToolbar: {
    enabled: false,
  },
  adapter: cloudflare(),
  integrations: [react()],
  vite: {
    optimizeDeps: {
      exclude: serverOnlyOptimizeExcludes,
    },
    plugins: [payMongoDevProxy(), tailwindcss(), optimizeWorkerServerDeps()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  },
});
