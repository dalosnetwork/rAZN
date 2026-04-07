import { Hono } from "hono";

import { getUserAccess } from "../lib/rbac";
import { requireAuth } from "../middleware/auth";
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
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user") as { id?: unknown } | null;
    const userId = typeof user?.id === "string"
      ? user.id
      : null;

    const access = userId
      ? await getUserAccess(userId)
      : {
          roleSlugs: [],
          permissionKeys: [],
        };

    return c.json({
      user: c.get("user"),
      session: c.get("session"),
      access,
    });
  })
  .route("/dashboard", dashboardRoutes)
  .route("/users", usersRoutes)
  .route("/", authRoutes);

export { apiCompatRoutes };
