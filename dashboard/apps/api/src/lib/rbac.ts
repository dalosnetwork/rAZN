import {
  SUPER_ADMIN_ROLE_SLUG,
  type PermissionKey,
  type RoleSlug,
} from "@repo/auth/rbac";
import {
  permissionTable,
  rolePermissionTable,
  roleTable,
  userRoleTable,
} from "@repo/db";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "./db";

export type UserAccess = {
  roleSlugs: string[];
  permissionKeys: string[];
};

export async function getUserAccess(userId: string): Promise<UserAccess> {
  const rows = await db
    .select({
      roleSlug: roleTable.slug,
      permissionKey: permissionTable.key,
    })
    .from(userRoleTable)
    .innerJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
    .leftJoin(rolePermissionTable, eq(roleTable.id, rolePermissionTable.roleId))
    .leftJoin(
      permissionTable,
      eq(rolePermissionTable.permissionId, permissionTable.id),
    )
    .where(eq(userRoleTable.userId, userId));

  const roleSet = new Set<string>();
  const permissionSet = new Set<string>();

  for (const row of rows) {
    if (row.roleSlug) {
      roleSet.add(row.roleSlug);
    }
    if (row.permissionKey) {
      permissionSet.add(row.permissionKey);
    }
  }

  return {
    roleSlugs: [...roleSet],
    permissionKeys: [...permissionSet],
  };
}

export function hasRole(access: UserAccess, roleSlug: RoleSlug): boolean {
  return access.roleSlugs.includes(roleSlug);
}

export function hasPermission(
  access: UserAccess,
  permissionKey: PermissionKey,
): boolean {
  if (hasRole(access, SUPER_ADMIN_ROLE_SLUG)) {
    return true;
  }

  return access.permissionKeys.includes(permissionKey);
}

export async function hasAnyPermission(
  userId: string,
  permissionKey: PermissionKey,
): Promise<boolean> {
  const access = await getUserAccess(userId);
  return hasPermission(access, permissionKey);
}

export async function hasRequiredRole(
  userId: string,
  roleSlug: RoleSlug,
): Promise<boolean> {
  const [row] = await db
    .select({
      roleSlug: roleTable.slug,
    })
    .from(userRoleTable)
    .innerJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
    .where(and(eq(userRoleTable.userId, userId), eq(roleTable.slug, roleSlug)))
    .limit(1);

  return Boolean(row);
}

export async function getUserPermissionKeys(
  userId: string,
): Promise<PermissionKey[]> {
  const access = await getUserAccess(userId);
  return access.permissionKeys.filter(Boolean) as PermissionKey[];
}

export async function getUserRoleSlugs(userId: string): Promise<RoleSlug[]> {
  const access = await getUserAccess(userId);
  return access.roleSlugs.filter(Boolean) as RoleSlug[];
}

export async function getPermissionsForRoles(
  roleIds: string[],
): Promise<Set<string>> {
  if (roleIds.length === 0) {
    return new Set();
  }

  const rows = await db
    .select({
      key: permissionTable.key,
    })
    .from(rolePermissionTable)
    .innerJoin(
      permissionTable,
      eq(rolePermissionTable.permissionId, permissionTable.id),
    )
    .where(inArray(rolePermissionTable.roleId, roleIds));

  return new Set(rows.map((row) => row.key));
}
