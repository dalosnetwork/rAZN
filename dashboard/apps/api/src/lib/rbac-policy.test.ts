import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_ROLE_SLUGS,
  DASHBOARD_EDITOR_ROLE_SLUGS,
  getPermissionKeysForRole,
  SUPER_ADMIN_ROLE_SLUG,
  hasAdminRole,
  hasDashboardEditorRole,
  hasRolePermission,
} from "@repo/auth/rbac";

test("admin role groups include super admin and operational admin roles", () => {
  assert.equal(ADMIN_ROLE_SLUGS.includes("compliance_officer"), true);
  assert.equal(ADMIN_ROLE_SLUGS.includes(SUPER_ADMIN_ROLE_SLUG), true);
});

test("dashboard editor role group includes user and super admin", () => {
  assert.equal(DASHBOARD_EDITOR_ROLE_SLUGS.includes("user"), true);
  assert.equal(
    DASHBOARD_EDITOR_ROLE_SLUGS.includes(SUPER_ADMIN_ROLE_SLUG),
    true,
  );
});

test("hasAdminRole only allows admin-class roles", () => {
  assert.equal(hasAdminRole(["compliance_officer"]), true);
  assert.equal(hasAdminRole([SUPER_ADMIN_ROLE_SLUG]), true);
  assert.equal(hasAdminRole(["user"]), false);
  assert.equal(hasAdminRole(["read_only"]), false);
});

test("hasDashboardEditorRole includes user and admin-class roles but excludes read_only", () => {
  assert.equal(hasDashboardEditorRole(["user"]), true);
  assert.equal(hasDashboardEditorRole([SUPER_ADMIN_ROLE_SLUG]), true);
  assert.equal(hasDashboardEditorRole(["compliance_officer"]), true);
  assert.equal(hasDashboardEditorRole(["read_only"]), false);
});

test("super admin has admin-class permissions", () => {
  assert.equal(hasRolePermission("super_admin", "dashboard.manage"), true);
  assert.equal(hasRolePermission("super_admin", "token.mint"), true);
  assert.equal(hasRolePermission("super_admin", "users.manage"), true);
});

test("user permissions stay scoped to non-admin defaults", () => {
  assert.equal(hasRolePermission("user", "dashboard.view"), true);
  assert.equal(hasRolePermission("user", "settings.view"), true);
  assert.equal(hasRolePermission("user", "dashboard.manage"), false);
  assert.equal(hasRolePermission("user", "token.mint"), false);
});

test("role permission lookup returns expected keys for user/super_admin", () => {
  const userPermissionKeys = getPermissionKeysForRole("user");
  const superAdminPermissionKeys = getPermissionKeysForRole("super_admin");

  assert.equal(userPermissionKeys.includes("dashboard.view"), true);
  assert.equal(userPermissionKeys.includes("dashboard.manage"), false);
  assert.equal(superAdminPermissionKeys.includes("dashboard.manage"), true);
  assert.equal(superAdminPermissionKeys.includes("token.burn"), true);
});
