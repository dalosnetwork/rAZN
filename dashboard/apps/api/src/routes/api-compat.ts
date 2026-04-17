import { Hono } from "hono";

import {
  requireAuth,
  requireAuthAllowPendingOnboarding,
} from "../middleware/auth";
import type { AppEnv } from "../types";
import { authRoutes } from "./auth";
import { dashboardRoutes } from "./dashboard";
import { usersRoutes } from "./users";

/**
 * Compatibility routes under /api for reverse-proxy setups that send
 * /api/* to the API server (e.g. nginx proxy_pass /api -> api:3002).
 * Without this, the API only has /users/me and /auth/register etc., so
 * GET /api/me and POST /api/register would 404.
 */
const apiCompatRoutes = new Hono<AppEnv>()
  .get("/me", requireAuthAllowPendingOnboarding, (c) => {
    return c.json({
      user: c.get("user"),
      session: c.get("session"),
      access: c.get("access"),
      onboarding: c.get("onboarding"),
    });
  })
  .route("/dashboard", dashboardRoutes)
  .route("/users", usersRoutes)
  .route("/", authRoutes);

export { apiCompatRoutes };
