import cors from "@elysiajs/cors";

const allowedOrigins = [/^http:\/\/localhost(?::\d+)?$/, /^http:\/\/127\.0\.0\.1(?::\d+)?$/];

export function corsMiddleware() {
  return cors({
    origin: (request: Request) => {
      const origin = request.headers.get("origin");
      if (!origin) return false;

      return allowedOrigins.some((allowedOrigin) => allowedOrigin.test(origin));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposeHeaders: ["X-Request-Id", "X-Response-Time"],
    credentials: false,
    maxAge: 3600,
  });
}
