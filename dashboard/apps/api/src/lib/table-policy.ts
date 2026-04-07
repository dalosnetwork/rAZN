import type { PermissionKey } from "@repo/auth/rbac";

import { hasPermission, type UserAccess } from "./rbac";

export type TableResource = "users";

export type TableOperation = "read" | "create" | "update" | "delete";

const TABLE_OPERATION_PERMISSION_MAP: Record<
  TableResource,
  Record<TableOperation, PermissionKey>
> = {
  users: {
    read: "users.view",
    create: "users.manage",
    update: "users.manage",
    delete: "users.manage",
  },
};

export function getRequiredPermissionForTableOperation(
  resource: TableResource,
  operation: TableOperation,
): PermissionKey {
  return TABLE_OPERATION_PERMISSION_MAP[resource][operation];
}

export function canAccessTableOperation(
  access: UserAccess,
  resource: TableResource,
  operation: TableOperation,
): boolean {
  const permissionKey = getRequiredPermissionForTableOperation(
    resource,
    operation,
  );
  return hasPermission(access, permissionKey);
}
