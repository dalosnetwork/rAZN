import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { redis } from "./lib/redis";
import { rateLimit } from "./middleware/rate-limit";
import { secureHeaders } from "./middleware/secure-headers";
import { routes } from "./routes";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

const allowedOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return allowedOrigins[0] ?? "";
      }

      return allowedOrigins.includes(origin) ? origin : "";
    },
    credentials: true,
  }),
);
app.use("*", logger());
app.use("*", secureHeaders());
const rateLimitMiddleware = rateLimit();
app.use("/auth/*", rateLimitMiddleware);
app.use("/dashboard/*", rateLimitMiddleware);
app.use("/users/*", rateLimitMiddleware);
app.use("/api/*", rateLimitMiddleware);

app.get("/health", async (c) => {
  const redisStatus = redis.status;
  const redisPing = await redis.ping();

  return c.json({
    ok: true,
    redis: redisStatus,
    db: "connected",
    redisPing,
  });
});

const routedApp = app.route("/", routes);

export type AppType = typeof routedApp;
export { routedApp as app };
