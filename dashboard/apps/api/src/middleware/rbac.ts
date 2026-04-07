import {
  SUPER_ADMIN_ROLE_SLUG,
  type PermissionKey,
  type RoleSlug,
} from "@repo/auth/rbac";
import { createMiddleware } from "hono/factory";

import { hasPermission } from "../lib/rbac";
import {
  canAccessTableOperation,
  type TableOperation,
  type TableResource,
} from "../lib/table-policy";
import type { AppEnv } from "../types";

export function requirePermission(permissionKey: PermissionKey) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const access = c.get("access");
    if (!hasPermission(access, permissionKey)) {
      return c.json({ message: "Forbidden" }, 403);
    }

    await next();
  });
}

export function requireAnyPermission(permissionKeys: readonly PermissionKey[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const access = c.get("access");
    const isAllowed = permissionKeys.some((permissionKey) =>
      hasPermission(access, permissionKey),
    );
    if (!isAllowed) {
      return c.json({ message: "Forbidden" }, 403);
    }

    await next();
  });
}

export function requireRole(roleSlug: RoleSlug) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const access = c.get("access");
    if (
      access.roleSlugs.includes(SUPER_ADMIN_ROLE_SLUG) ||
      access.roleSlugs.includes(roleSlug)
    ) {
      await next();
      return;
    }

    return c.json({ message: "Forbidden" }, 403);
  });
}

export function requireAnyRole(roleSlugs: readonly RoleSlug[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const access = c.get("access");
    if (access.roleSlugs.includes(SUPER_ADMIN_ROLE_SLUG)) {
      await next();
      return;
    }

    const isAllowed = roleSlugs.some((roleSlug) =>
      access.roleSlugs.includes(roleSlug),
    );
    if (!isAllowed) {
      return c.json({ message: "Forbidden" }, 403);
    }

    await next();
  });
}

export function requireTableOperation(
  resource: TableResource,
  operation: TableOperation,
) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const access = c.get("access");
    if (!canAccessTableOperation(access, resource, operation)) {
      return c.json({ message: "Forbidden" }, 403);
    }

    await next();
  });
}
