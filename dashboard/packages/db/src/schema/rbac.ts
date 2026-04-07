import { relations } from "drizzle-orm";
import {
  index,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { identitySchema, userTable } from "./identity";

export const roleTable = identitySchema.table(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    slugUniqueIdx: uniqueIndex("roles_slug_unique").on(table.slug),
    nameUniqueIdx: uniqueIndex("roles_name_unique").on(table.name),
  }),
);

export const permissionTable = identitySchema.table(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    keyUniqueIdx: uniqueIndex("permissions_key_unique").on(table.key),
  }),
);

export const rolePermissionTable = identitySchema.table(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roleTable.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissionTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      name: "role_permissions_pkey",
      columns: [table.roleId, table.permissionId],
    }),
    roleIdx: index("role_permissions_role_id_idx").on(table.roleId),
    permissionIdx: index("role_permissions_permission_id_idx").on(
      table.permissionId,
    ),
  }),
);

export const userRoleTable = identitySchema.table(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roleTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      name: "user_roles_pkey",
      columns: [table.userId, table.roleId],
    }),
    userIdx: index("user_roles_user_id_idx").on(table.userId),
    roleIdx: index("user_roles_role_id_idx").on(table.roleId),
  }),
);

export const roleRelations = relations(roleTable, ({ many }) => ({
  rolePermissions: many(rolePermissionTable),
  userRoles: many(userRoleTable),
}));

export const permissionRelations = relations(permissionTable, ({ many }) => ({
  rolePermissions: many(rolePermissionTable),
}));

export const rolePermissionRelations = relations(
  rolePermissionTable,
  ({ one }) => ({
    role: one(roleTable, {
      fields: [rolePermissionTable.roleId],
      references: [roleTable.id],
    }),
    permission: one(permissionTable, {
      fields: [rolePermissionTable.permissionId],
      references: [permissionTable.id],
    }),
  }),
);

export const userRoleRelations = relations(userRoleTable, ({ one }) => ({
  user: one(userTable, {
    fields: [userRoleTable.userId],
    references: [userTable.id],
  }),
  role: one(roleTable, {
    fields: [userRoleTable.roleId],
    references: [roleTable.id],
  }),
}));
