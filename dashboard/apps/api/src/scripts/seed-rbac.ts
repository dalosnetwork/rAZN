import { config as loadEnv } from "dotenv";
import { and, eq, inArray, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RBAC_PERMISSIONS, RBAC_ROLES } from "@repo/auth/rbac";

import {
  accountTable,
  createDb,
  permissionTable,
  rolePermissionTable,
  roleTable,
  userRoleTable,
  userTable,
} from "@repo/db";

type PermissionSeed = {
  key: string;
  name: string;
  description: string;
};

type RoleSeed = {
  slug: string;
  name: string;
  description: string;
  permissionKeys: string[];
};

type UserSeed = {
  name: string;
  email: string;
  password: string;
  roleSlug: string;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(scriptDirectory, "../../../../.env") });

const PERMISSIONS: PermissionSeed[] = RBAC_PERMISSIONS.map((permission) => ({
  key: permission.key,
  name: permission.name,
  description: permission.description,
}));

const ROLES: RoleSeed[] = RBAC_ROLES.map((role) => ({
  slug: role.slug,
  name: role.name,
  description: role.description,
  permissionKeys: [...role.permissionKeys],
}));

function getSeedUsers(): UserSeed[] {
  return [
    {
      name: "Super Admin",
      email:
        process.env.SEED_SUPER_ADMIN_EMAIL ?? "super.admin@dashboard.local",
      password: process.env.SEED_SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!",
      roleSlug: "super_admin",
    },
    {
      name: "Compliance Officer",
      email: process.env.SEED_COMPLIANCE_EMAIL ?? "compliance@dashboard.local",
      password: process.env.SEED_COMPLIANCE_PASSWORD ?? "Compliance123!",
      roleSlug: "compliance_officer",
    },
    {
      name: "Treasurer",
      email: process.env.SEED_TREASURER_EMAIL ?? "treasurer@dashboard.local",
      password: process.env.SEED_TREASURER_PASSWORD ?? "Treasurer123!",
      roleSlug: "treasurer",
    },
    {
      name: "Risk Officer",
      email: process.env.SEED_RISK_EMAIL ?? "risk@dashboard.local",
      password: process.env.SEED_RISK_PASSWORD ?? "Risk123!",
      roleSlug: "risk_officer",
    },
    {
      name: "Redemption Officer",
      email: process.env.SEED_REDEMPTION_EMAIL ?? "redemption@dashboard.local",
      password: process.env.SEED_REDEMPTION_PASSWORD ?? "Redemption123!",
      roleSlug: "redemption_officer",
    },
    {
      name: "Standard User",
      email: process.env.SEED_USER_EMAIL ?? "user@dashboard.local",
      password: process.env.SEED_USER_PASSWORD ?? "User123!",
      roleSlug: "user",
    },
    {
      name: "Read Only User",
      email: process.env.SEED_READ_ONLY_EMAIL ?? "readonly@dashboard.local",
      password: process.env.SEED_READ_ONLY_PASSWORD ?? "ReadOnly123!",
      roleSlug: "read_only",
    },
  ];
}

async function ensureRbacTables(database: ReturnType<typeof createDb>) {
  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS identity.roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      slug text NOT NULL UNIQUE,
      name text NOT NULL UNIQUE,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS identity.permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text NOT NULL UNIQUE,
      name text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS identity.role_permissions (
      role_id uuid NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
      permission_id uuid NOT NULL REFERENCES identity.permissions(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (role_id, permission_id)
    );
  `);
  await database.execute(
    sql`CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON identity.role_permissions (role_id);`,
  );
  await database.execute(
    sql`CREATE INDEX IF NOT EXISTS role_permissions_permission_id_idx ON identity.role_permissions (permission_id);`,
  );

  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS identity.user_roles (
      user_id text NOT NULL REFERENCES identity."user"(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES identity.roles(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, role_id)
    );
  `);
  await database.execute(
    sql`CREATE INDEX IF NOT EXISTS user_roles_user_id_idx ON identity.user_roles (user_id);`,
  );
  await database.execute(
    sql`CREATE INDEX IF NOT EXISTS user_roles_role_id_idx ON identity.user_roles (role_id);`,
  );
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;

  if (!user || !password || !database) {
    return null;
  }

  const host = process.env.POSTGRES_HOST ?? process.env.PGHOST ?? "localhost";
  const port = process.env.POSTGRES_PORT ?? process.env.PGPORT ?? "5432";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

async function main() {
  const databaseUrl = resolveDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(
      "Missing database configuration. Set DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB.",
    );
  }

  const db = createDb(databaseUrl);

  try {
    await ensureRbacTables(db);

    const now = new Date();

    await db
      .insert(permissionTable)
      .values(
        PERMISSIONS.map((permission) => ({
          key: permission.key,
          name: permission.name,
          description: permission.description,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing();

    await db
      .insert(roleTable)
      .values(
        ROLES.map((role) => ({
          slug: role.slug,
          name: role.name,
          description: role.description,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing();

    const permissions = await db
      .select({
        id: permissionTable.id,
        key: permissionTable.key,
      })
      .from(permissionTable)
      .where(
        inArray(
          permissionTable.key,
          PERMISSIONS.map((permission) => permission.key),
        ),
      );

    const roles = await db
      .select({
        id: roleTable.id,
        slug: roleTable.slug,
      })
      .from(roleTable)
      .where(
        inArray(
          roleTable.slug,
          ROLES.map((role) => role.slug),
        ),
      );

    const permissionIdByKey = new Map(
      permissions.map((permission) => [permission.key, permission.id] as const),
    );
    const roleIdBySlug = new Map(
      roles.map((role) => [role.slug, role.id] as const),
    );

    const rolePermissionValues = ROLES.flatMap((role) => {
      const roleId = roleIdBySlug.get(role.slug);
      if (!roleId) {
        throw new Error(`Role ${role.slug} was not found after seeding.`);
      }

      return role.permissionKeys.map((permissionKey) => {
        const permissionId = permissionIdByKey.get(permissionKey);
        if (!permissionId) {
          throw new Error(
            `Permission ${permissionKey} was not found after seeding.`,
          );
        }

        return {
          roleId,
          permissionId,
          createdAt: now,
        };
      });
    });

    await db
      .insert(rolePermissionTable)
      .values(rolePermissionValues)
      .onConflictDoNothing();

    const seedUsers = getSeedUsers();
    let createdUsersCount = 0;
    let linkedCredentialAccountsCount = 0;
    let assignedRolesCount = 0;

    for (const seedUser of seedUsers) {
      const normalizedEmail = seedUser.email.trim().toLowerCase();

      const [existingUser] = await db
        .select({
          id: userTable.id,
          email: userTable.email,
        })
        .from(userTable)
        .where(eq(userTable.email, normalizedEmail))
        .limit(1);

      const userId = existingUser?.id ?? randomUUID();
      if (!existingUser) {
        const userNow = new Date();
        const passwordHash = await hashPassword(seedUser.password);

        await db.insert(userTable).values({
          id: userId,
          name: seedUser.name,
          email: normalizedEmail,
          emailVerified: true,
          image: null,
          createdAt: userNow,
          updatedAt: userNow,
        });

        await db.insert(accountTable).values({
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: passwordHash,
          createdAt: userNow,
          updatedAt: userNow,
        });

        createdUsersCount += 1;
        linkedCredentialAccountsCount += 1;
      } else {
        const [credentialAccount] = await db
          .select({ id: accountTable.id })
          .from(accountTable)
          .where(
            and(
              eq(accountTable.userId, userId),
              eq(accountTable.providerId, "credential"),
            ),
          )
          .limit(1);

        if (!credentialAccount) {
          const passwordHash = await hashPassword(seedUser.password);
          const accountNow = new Date();

          await db.insert(accountTable).values({
            id: randomUUID(),
            accountId: userId,
            providerId: "credential",
            userId,
            password: passwordHash,
            createdAt: accountNow,
            updatedAt: accountNow,
          });

          linkedCredentialAccountsCount += 1;
        }
      }

      const roleId = roleIdBySlug.get(seedUser.roleSlug);
      if (!roleId) {
        throw new Error(
          `Role ${seedUser.roleSlug} was not found for user ${seedUser.email}.`,
        );
      }

      const userRoleResult = await db
        .insert(userRoleTable)
        .values({
          userId,
          roleId,
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .returning({ roleId: userRoleTable.roleId });

      if (userRoleResult.length > 0) {
        assignedRolesCount += 1;
      }
    }

    console.log("RBAC seed complete.");
    console.log(`Permissions seeded: ${PERMISSIONS.length}`);
    console.log(`Roles seeded: ${ROLES.length}`);
    console.log(`Users created: ${createdUsersCount}`);
    console.log(`Credential accounts linked: ${linkedCredentialAccountsCount}`);
    console.log(`User-role assignments added: ${assignedRolesCount}`);
  } finally {
    await db.$client.end();
  }
}

main().catch((error) => {
  console.error("RBAC seed failed.");
  console.error(error);
  process.exitCode = 1;
});
