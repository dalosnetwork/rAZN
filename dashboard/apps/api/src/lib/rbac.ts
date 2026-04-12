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
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "./db";

export type UserAccess = {
  roleSlugs: string[];
  permissionKeys: string[];
};

export type RbacPermissionRow = {
  key: string;
  name: string;
  description: string | null;
};

export type RbacRoleRow = {
  slug: string;
  name: string;
  description: string | null;
  permissionKeys: string[];
};

export const RBAC_MANAGEMENT_ERRORS = {
  roleNotFound: "ROLE_NOT_FOUND",
  immutableRole: "IMMUTABLE_ROLE",
  invalidPermissionKeys: "INVALID_PERMISSION_KEYS",
} as const;

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

export async function listRbacPermissions(): Promise<RbacPermissionRow[]> {
  return db
    .select({
      key: permissionTable.key,
      name: permissionTable.name,
      description: permissionTable.description,
    })
    .from(permissionTable)
    .orderBy(asc(permissionTable.key));
}

export async function listRbacRolesWithPermissions(): Promise<RbacRoleRow[]> {
  const roles = await db
    .select({
      id: roleTable.id,
      slug: roleTable.slug,
      name: roleTable.name,
      description: roleTable.description,
    })
    .from(roleTable)
    .orderBy(asc(roleTable.slug));

  if (roles.length === 0) {
    return [];
  }

  const roleIds = roles.map((role) => role.id);
  const rolePermissionRows = await db
    .select({
      roleId: rolePermissionTable.roleId,
      key: permissionTable.key,
    })
    .from(rolePermissionTable)
    .innerJoin(
      permissionTable,
      eq(rolePermissionTable.permissionId, permissionTable.id),
    )
    .where(inArray(rolePermissionTable.roleId, roleIds))
    .orderBy(asc(permissionTable.key));

  const permissionKeysByRoleId = new Map<string, string[]>();
  for (const row of rolePermissionRows) {
    const existing = permissionKeysByRoleId.get(row.roleId) ?? [];
    existing.push(row.key);
    permissionKeysByRoleId.set(row.roleId, existing);
  }

  return roles.map((role) => ({
    slug: role.slug,
    name: role.name,
    description: role.description,
    permissionKeys: permissionKeysByRoleId.get(role.id) ?? [],
  }));
}

export async function updateRolePermissionsBySlug(
  roleSlug: string,
  permissionKeys: string[],
): Promise<RbacRoleRow> {
  return db.transaction(async (tx) => {
    const [role] = await tx
      .select({
        id: roleTable.id,
        slug: roleTable.slug,
        name: roleTable.name,
        description: roleTable.description,
      })
      .from(roleTable)
      .where(eq(roleTable.slug, roleSlug))
      .limit(1);

    if (!role) {
      throw new Error(RBAC_MANAGEMENT_ERRORS.roleNotFound);
    }

    if (role.slug === SUPER_ADMIN_ROLE_SLUG) {
      throw new Error(RBAC_MANAGEMENT_ERRORS.immutableRole);
    }

    const normalizedPermissionKeys = Array.from(new Set(permissionKeys)).sort(
      (a, b) => a.localeCompare(b),
    );

    let permissions: Array<{ id: string; key: string }> = [];
    if (normalizedPermissionKeys.length > 0) {
      permissions = await tx
        .select({
          id: permissionTable.id,
          key: permissionTable.key,
        })
        .from(permissionTable)
        .where(inArray(permissionTable.key, normalizedPermissionKeys));
    }

    const permissionIdByKey = new Map(
      permissions.map((permission) => [permission.key, permission.id] as const),
    );
    const missingPermissionKeys = normalizedPermissionKeys.filter(
      (key) => !permissionIdByKey.has(key),
    );
    if (missingPermissionKeys.length > 0) {
      throw new Error(RBAC_MANAGEMENT_ERRORS.invalidPermissionKeys);
    }

    await tx
      .delete(rolePermissionTable)
      .where(eq(rolePermissionTable.roleId, role.id));

    if (normalizedPermissionKeys.length > 0) {
      await tx.insert(rolePermissionTable).values(
        normalizedPermissionKeys.map((key) => ({
          roleId: role.id,
          permissionId: permissionIdByKey.get(key)!,
        })),
      );
    }

    await tx
      .update(roleTable)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(roleTable.id, role.id));

    return {
      slug: role.slug,
      name: role.name,
      description: role.description,
      permissionKeys: normalizedPermissionKeys,
    };
  });
}
