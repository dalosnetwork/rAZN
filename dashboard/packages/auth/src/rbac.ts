export const RBAC_PERMISSIONS = [
  {
    key: "dashboard.view",
    name: "View dashboard",
    description: "Can view dashboard pages and widgets.",
  },
  {
    key: "dashboard.manage",
    name: "Manage dashboard",
    description: "Can create, edit and delete dashboard content.",
  },
  {
    key: "users.view",
    name: "View users",
    description: "Can view users and profile details.",
  },
  {
    key: "users.manage",
    name: "Manage users",
    description: "Can create, update and disable users.",
  },
  {
    key: "roles.view",
    name: "View roles",
    description: "Can view roles and assigned permissions.",
  },
  {
    key: "roles.manage",
    name: "Manage roles",
    description: "Can create and modify roles and permissions.",
  },
  {
    key: "settings.view",
    name: "View settings",
    description: "Can view app settings.",
  },
  {
    key: "settings.manage",
    name: "Manage settings",
    description: "Can update app settings.",
  },
  {
    key: "token.mint",
    name: "Token mint",
    description: "Can perform token mint operations.",
  },
  {
    key: "token.burn",
    name: "Token burn",
    description: "Can perform token burn operations.",
  },
  {
    key: "token.pause",
    name: "Token pause",
    description: "Can pause token operations.",
  },
  {
    key: "token.blacklist",
    name: "Token blacklist",
    description: "Can manage token blacklist operations.",
  },
  {
    key: "offchain.kyc_review",
    name: "KYC review",
    description: "Can review off-chain KYC/KYB workflows.",
  },
  {
    key: "offchain.fiat_movements",
    name: "Fiat movements",
    description: "Can manage off-chain fiat movement operations.",
  },
  {
    key: "offchain.emergency",
    name: "Emergency actions",
    description: "Can execute emergency off-chain operations.",
  },
] as const;

export type PermissionKey = (typeof RBAC_PERMISSIONS)[number]["key"];

export type RbacPermissionDefinition = (typeof RBAC_PERMISSIONS)[number];

const allPermissionKeys: PermissionKey[] = RBAC_PERMISSIONS.map(
  (permission) => permission.key,
);

export const SUPER_ADMIN_ROLE_SLUG = "super_admin" as const;

const ADMIN_DASHBOARD_BASE_PERMISSIONS = [
  "dashboard.view",
  "dashboard.manage",
  "settings.view",
] as const satisfies PermissionKey[];

export const RBAC_ROLES = [
  {
    slug: SUPER_ADMIN_ROLE_SLUG,
    name: "Super Admin",
    description: "Full access to all features and administration.",
    permissionKeys: allPermissionKeys,
  },
  {
    slug: "compliance_officer",
    name: "Compliance Officer",
    description:
      "Can pause/blacklist token operations and perform KYC review workflows.",
    permissionKeys: [
      ...ADMIN_DASHBOARD_BASE_PERMISSIONS,
      "token.pause",
      "token.blacklist",
      "offchain.kyc_review",
    ] satisfies PermissionKey[],
  },
  {
    slug: "treasurer",
    name: "Treasurer",
    description:
      "Can execute mint/burn operations and manage fiat movement workflows.",
    permissionKeys: [
      ...ADMIN_DASHBOARD_BASE_PERMISSIONS,
      "token.mint",
      "token.burn",
      "offchain.fiat_movements",
    ] satisfies PermissionKey[],
  },
  {
    slug: "risk_officer",
    name: "Risk",
    description: "Can perform pause controls and emergency response actions.",
    permissionKeys: [
      ...ADMIN_DASHBOARD_BASE_PERMISSIONS,
      "token.pause",
      "offchain.emergency",
    ] satisfies PermissionKey[],
  },
  {
    slug: "redemption_officer",
    name: "Redemption",
    description:
      "Can execute burn operations and process fiat movement workflows.",
    permissionKeys: [
      ...ADMIN_DASHBOARD_BASE_PERMISSIONS,
      "token.burn",
      "offchain.fiat_movements",
    ] satisfies PermissionKey[],
  },
  {
    slug: "user",
    name: "User",
    description: "Standard authenticated user with basic dashboard access.",
    permissionKeys: [
      "dashboard.view",
      "settings.view",
    ] satisfies PermissionKey[],
  },
  {
    slug: "read_only",
    name: "Read Only",
    description: "Read-only access to dashboards and user listings.",
    permissionKeys: [
      "dashboard.view",
      "users.view",
      "roles.view",
      "settings.view",
    ] satisfies PermissionKey[],
  },
] as const;

export type RoleSlug = (typeof RBAC_ROLES)[number]["slug"];

export type RbacRoleDefinition = (typeof RBAC_ROLES)[number];

export const ADMIN_ROLE_SLUGS = [
  SUPER_ADMIN_ROLE_SLUG,
  "compliance_officer",
  "treasurer",
  "risk_officer",
  "redemption_officer",
] as const satisfies RoleSlug[];

export const DASHBOARD_EDITOR_ROLE_SLUGS = [
  SUPER_ADMIN_ROLE_SLUG,
  "user",
  "compliance_officer",
  "treasurer",
  "risk_officer",
  "redemption_officer",
] as const satisfies RoleSlug[];

const rolePermissionSetBySlug = new Map(
  RBAC_ROLES.map((role) => [role.slug, new Set(role.permissionKeys)] as const),
);

function hasAnyRoleInSet(
  roleSlugs: readonly string[],
  allowedRoleSet: ReadonlySet<RoleSlug>,
): boolean {
  return roleSlugs.some((roleSlug) => allowedRoleSet.has(roleSlug as RoleSlug));
}

const adminRoleSlugSet = new Set<RoleSlug>(ADMIN_ROLE_SLUGS);
const dashboardEditorRoleSlugSet = new Set<RoleSlug>(
  DASHBOARD_EDITOR_ROLE_SLUGS,
);

export function getPermissionKeysForRole(roleSlug: string): PermissionKey[] {
  const permissionSet = rolePermissionSetBySlug.get(roleSlug as RoleSlug);
  if (!permissionSet) {
    return [];
  }
  return [...permissionSet];
}

export function hasRolePermission(
  roleSlug: string,
  permissionKey: PermissionKey,
): boolean {
  const permissionSet = rolePermissionSetBySlug.get(roleSlug as RoleSlug);
  return permissionSet?.has(permissionKey) ?? false;
}

export function hasAdminRole(roleSlugs: readonly string[]): boolean {
  return hasAnyRoleInSet(roleSlugs, adminRoleSlugSet);
}

export function hasDashboardEditorRole(roleSlugs: readonly string[]): boolean {
  return hasAnyRoleInSet(roleSlugs, dashboardEditorRoleSlugSet);
}
