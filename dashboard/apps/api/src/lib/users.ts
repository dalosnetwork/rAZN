import { roleTable, userRoleTable, userTable } from "@repo/db";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "./db";

export type DashboardUserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: string[];
};

const DEFAULT_USERS_LIMIT = 200;

export async function listUsersWithRoles(
  limit = DEFAULT_USERS_LIMIT,
): Promise<DashboardUserRow[]> {
  const users = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      emailVerified: userTable.emailVerified,
      deletedAt: userTable.deletedAt,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })
    .from(userTable)
    .where(isNull(userTable.deletedAt))
    .orderBy(desc(userTable.createdAt))
    .limit(limit);

  if (users.length === 0) {
    return [];
  }

  const userIds = users.map((user) => user.id);

  const roleAssignments = await db
    .select({
      userId: userRoleTable.userId,
      roleSlug: roleTable.slug,
    })
    .from(userRoleTable)
    .innerJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
    .where(inArray(userRoleTable.userId, userIds));

  const rolesByUserId = new Map<string, string[]>();
  for (const row of roleAssignments) {
    const existing = rolesByUserId.get(row.userId) ?? [];
    existing.push(row.roleSlug);
    rolesByUserId.set(row.userId, existing);
  }

  return users.map((user) => ({
    ...user,
    roles: rolesByUserId.get(user.id) ?? [],
  }));
}

export type PaginatedUsersResult = {
  rows: DashboardUserRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type UsersSortBy = "name" | "email" | "createdAt" | "emailVerified";
export type UsersSortDirection = "asc" | "desc";

type UsersSorting = {
  sortBy: UsersSortBy;
  sortDirection: UsersSortDirection;
};

function getUsersOrderBy(
  sorting: UsersSorting,
): ReturnType<typeof asc> | ReturnType<typeof desc> {
  const column =
    sorting.sortBy === "name"
      ? userTable.name
      : sorting.sortBy === "email"
        ? userTable.email
        : sorting.sortBy === "emailVerified"
          ? userTable.emailVerified
          : userTable.createdAt;

  return sorting.sortDirection === "asc" ? asc(column) : desc(column);
}

export async function listUsersWithRolesPaginated(
  page: number,
  pageSize: number,
  sorting: UsersSorting = { sortBy: "createdAt", sortDirection: "desc" },
): Promise<PaginatedUsersResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const offset = (safePage - 1) * safePageSize;

  const countRows = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(userTable)
    .where(isNull(userTable.deletedAt));

  const total = Number(countRows[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));

  const users = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      emailVerified: userTable.emailVerified,
      deletedAt: userTable.deletedAt,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })
    .from(userTable)
    .where(isNull(userTable.deletedAt))
    .orderBy(getUsersOrderBy(sorting), desc(userTable.createdAt))
    .limit(safePageSize)
    .offset(offset);

  if (users.length === 0) {
    return {
      rows: [],
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages,
      },
    };
  }

  const userIds = users.map((user) => user.id);
  const roleAssignments = await db
    .select({
      userId: userRoleTable.userId,
      roleSlug: roleTable.slug,
    })
    .from(userRoleTable)
    .innerJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
    .where(inArray(userRoleTable.userId, userIds));

  const rolesByUserId = new Map<string, string[]>();
  for (const row of roleAssignments) {
    const existing = rolesByUserId.get(row.userId) ?? [];
    existing.push(row.roleSlug);
    rolesByUserId.set(row.userId, existing);
  }

  return {
    rows: users.map((user) => ({
      ...user,
      roles: rolesByUserId.get(user.id) ?? [],
    })),
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages,
    },
  };
}

export type UpdateDashboardUserInput = {
  name?: string;
  email?: string;
  emailVerified?: boolean;
  roleSlugs?: string[];
};

export async function getUserWithRolesById(
  userId: string,
): Promise<DashboardUserRow | null> {
  const [user] = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      emailVerified: userTable.emailVerified,
      deletedAt: userTable.deletedAt,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })
    .from(userTable)
    .where(and(eq(userTable.id, userId), isNull(userTable.deletedAt)))
    .limit(1);

  if (!user) {
    return null;
  }

  const roleAssignments = await db
    .select({
      roleSlug: roleTable.slug,
    })
    .from(userRoleTable)
    .innerJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
    .where(eq(userRoleTable.userId, userId));

  return {
    ...user,
    roles: roleAssignments.map((row) => row.roleSlug),
  };
}

export async function updateUserWithRoles(
  userId: string,
  input: UpdateDashboardUserInput,
): Promise<DashboardUserRow | null> {
  return db.transaction(async (tx) => {
    const patch: {
      name?: string;
      email?: string;
      emailVerified?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      patch.name = input.name;
    }

    if (input.email !== undefined) {
      patch.email = input.email;
    }

    if (input.emailVerified !== undefined) {
      patch.emailVerified = input.emailVerified;
    }

    await tx
      .update(userTable)
      .set(patch)
      .where(and(eq(userTable.id, userId), isNull(userTable.deletedAt)));

    if (input.roleSlugs) {
      await tx.delete(userRoleTable).where(eq(userRoleTable.userId, userId));

      if (input.roleSlugs.length > 0) {
        const roles = await tx
          .select({
            id: roleTable.id,
            slug: roleTable.slug,
          })
          .from(roleTable)
          .where(inArray(roleTable.slug, input.roleSlugs));

        const roleIdBySlug = new Map(roles.map((role) => [role.slug, role.id]));
        const missingSlugs = input.roleSlugs.filter(
          (slug) => !roleIdBySlug.has(slug),
        );

        if (missingSlugs.length > 0) {
          throw new Error("INVALID_ROLE_SLUGS");
        }

        await tx.insert(userRoleTable).values(
          input.roleSlugs.map((slug) => ({
            userId,
            roleId: roleIdBySlug.get(slug)!,
          })),
        );
      }
    }

    const [user] = await tx
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
        deletedAt: userTable.deletedAt,
        createdAt: userTable.createdAt,
        updatedAt: userTable.updatedAt,
      })
      .from(userTable)
      .where(and(eq(userTable.id, userId), isNull(userTable.deletedAt)))
      .limit(1);

    if (!user) {
      return null;
    }

    const roleAssignments = await tx
      .select({
        roleSlug: roleTable.slug,
      })
      .from(userRoleTable)
      .innerJoin(roleTable, eq(userRoleTable.roleId, roleTable.id))
      .where(eq(userRoleTable.userId, userId));

    return {
      ...user,
      roles: roleAssignments.map((row) => row.roleSlug),
    };
  });
}

export async function softDeleteUser(userId: string): Promise<boolean> {
  const rows = await db
    .update(userTable)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(userTable.id, userId), isNull(userTable.deletedAt)))
    .returning({ id: userTable.id });

  return rows.length > 0;
}
