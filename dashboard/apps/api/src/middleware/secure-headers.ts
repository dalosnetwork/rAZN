import { createMiddleware } from "hono/factory";

export function secureHeaders() {
  return createMiddleware(async (c, next) => {
    await next();

    c.header("X-Content-Type-Options", "nosniff");
    c.header("X-Frame-Options", "DENY");
    c.header("Referrer-Policy", "same-origin");
    c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    c.header("X-XSS-Protection", "0");
  });
}
