import { Hono } from "hono";
import { SUPER_ADMIN_ROLE_SLUG } from "@repo/auth/rbac";

import { listUsersWithRoles } from "../lib/users";
import { requireAuth } from "../middleware/auth";
import { requireRole, requireTableOperation } from "../middleware/rbac";
import type { AppEnv } from "../types";

const usersRoutes = new Hono<AppEnv>()
  .get("/me", requireAuth, (c) => {
    return c.json({
      user: c.get("user"),
      session: c.get("session"),
      access: c.get("access"),
    });
  })
  .get(
    "/",
    requireAuth,
    requireRole(SUPER_ADMIN_ROLE_SLUG),
    requireTableOperation("users", "read"),
    async (c) => {
      const rows = await listUsersWithRoles();

      return c.json({
        rows,
      });
    },
  );

export { usersRoutes };
