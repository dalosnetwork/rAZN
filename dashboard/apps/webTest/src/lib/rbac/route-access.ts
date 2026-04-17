import {
  ADMIN_ROLE_SLUGS,
  SUPER_ADMIN_ROLE_SLUG,
  type PermissionKey,
  type RoleSlug,
} from "@repo/auth/rbac";

import type {
  NavGroup,
  NavMainItem,
  NavSubItem,
} from "@/navigation/sidebar/sidebar-items";

export type UserAccess = {
  roleSlugs: string[];
  permissionKeys: string[];
};

type DashboardRouteRule = {
  pathPrefix: string;
  requiredPermission?: PermissionKey;
  requiredAnyPermissions?: PermissionKey[];
  allowedRoles?: RoleSlug[];
  disallowAdmin?: boolean;
};

const DASHBOARD_ROUTE_RULES: DashboardRouteRule[] = [
  {
    pathPrefix: "/dashboard/admin/admin-role-management",
    allowedRoles: [SUPER_ADMIN_ROLE_SLUG],
  },
  {
    pathPrefix: "/dashboard/admin/settings",
    allowedRoles: [SUPER_ADMIN_ROLE_SLUG],
  },
  {
    pathPrefix: "/dashboard/admin/institution-management",
    allowedRoles: ADMIN_ROLE_SLUGS,
    requiredPermission: "offchain.kyc_review",
  },
  {
    pathPrefix: "/dashboard/admin/mint-ops",
    allowedRoles: ADMIN_ROLE_SLUGS,
    requiredPermission: "token.mint",
  },
  {
    pathPrefix: "/dashboard/admin/redemption-ops",
    allowedRoles: ADMIN_ROLE_SLUGS,
    requiredPermission: "token.burn",
  },
  {
    pathPrefix: "/dashboard/admin/reserve-management",
    allowedRoles: ADMIN_ROLE_SLUGS,
    requiredPermission: "offchain.fiat_movements",
  },
  {
    pathPrefix: "/dashboard/admin/wallet",
    allowedRoles: ADMIN_ROLE_SLUGS,
    requiredAnyPermissions: ["token.pause", "offchain.emergency"],
  },
  {
    pathPrefix: "/dashboard/admin/overview",
    allowedRoles: ADMIN_ROLE_SLUGS,
    requiredPermission: "dashboard.manage",
  },
  {
    pathPrefix: "/dashboard/admin",
    allowedRoles: ADMIN_ROLE_SLUGS,
    requiredPermission: "dashboard.manage",
  },
  { pathPrefix: "/dashboard/users", allowedRoles: [SUPER_ADMIN_ROLE_SLUG] },
  { pathPrefix: "/dashboard/default", allowedRoles: [SUPER_ADMIN_ROLE_SLUG] },
  { pathPrefix: "/dashboard/crm", allowedRoles: [SUPER_ADMIN_ROLE_SLUG] },
  { pathPrefix: "/dashboard/finance", allowedRoles: [SUPER_ADMIN_ROLE_SLUG] },
  { pathPrefix: "/dashboard/analytics", allowedRoles: [SUPER_ADMIN_ROLE_SLUG] },
  { pathPrefix: "/dashboard/profile", allowedRoles: [SUPER_ADMIN_ROLE_SLUG] },
  {
    pathPrefix: "/dashboard/coming-soon",
    allowedRoles: [SUPER_ADMIN_ROLE_SLUG],
  },
  {
    pathPrefix: "/dashboard/overview",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard/mint",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard/redeem",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard/kyb",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard/notifications",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard/reserve-transparency",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard/wallet",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard/banking",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard/settings",
    requiredPermission: "dashboard.view",
    disallowAdmin: true,
  },
  {
    pathPrefix: "/dashboard",
    requiredAnyPermissions: ["dashboard.view", "dashboard.manage"],
  },
];

function hasRole(access: UserAccess, roleSlug: RoleSlug) {
  return access.roleSlugs.includes(roleSlug);
}

function hasAdminRole(access: UserAccess) {
  return ADMIN_ROLE_SLUGS.some((roleSlug) => access.roleSlugs.includes(roleSlug));
}

function hasPermission(access: UserAccess, permissionKey: PermissionKey) {
  if (hasRole(access, SUPER_ADMIN_ROLE_SLUG)) {
    return true;
  }

  return access.permissionKeys.includes(permissionKey);
}

function hasAnyPermission(access: UserAccess, permissionKeys: PermissionKey[]) {
  if (hasRole(access, SUPER_ADMIN_ROLE_SLUG)) {
    return true;
  }

  return permissionKeys.some((permissionKey) =>
    access.permissionKeys.includes(permissionKey),
  );
}

export function hasAccessPermission(
  access: UserAccess | null | undefined,
  permissionKey: PermissionKey,
) {
  if (!access) {
    return false;
  }
  return hasPermission(access, permissionKey);
}

export function canManageDashboard(access: UserAccess | null | undefined) {
  return hasAccessPermission(access, "dashboard.manage");
}

export function getDefaultDashboardPath(
  access: UserAccess | null | undefined,
) {
  return canManageDashboard(access)
    ? "/dashboard/admin/overview"
    : "/dashboard/overview";
}

function matchRule(pathname: string) {
  return DASHBOARD_ROUTE_RULES.filter((rule) =>
    pathname.startsWith(rule.pathPrefix),
  ).sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0];
}

export function canAccessDashboardPath(pathname: string, access: UserAccess) {
  if (!pathname.startsWith("/dashboard")) {
    return true;
  }

  const rule = matchRule(pathname);
  if (!rule) {
    return true;
  }

  if (rule.allowedRoles?.length) {
    const isAllowedByRole = rule.allowedRoles.some((roleSlug) =>
      hasRole(access, roleSlug),
    );
    if (!isAllowedByRole) {
      return false;
    }
  }

  if (rule.disallowAdmin && hasAdminRole(access)) {
    return false;
  }

  if (rule.requiredPermission) {
    if (!hasPermission(access, rule.requiredPermission)) {
      return false;
    }
  }

  if (rule.requiredAnyPermissions?.length) {
    if (!hasAnyPermission(access, rule.requiredAnyPermissions)) {
      return false;
    }
  }

  return true;
}

function canAccessNavUrl(url: string, access: UserAccess) {
  if (!url.startsWith("/dashboard")) {
    return true;
  }
  return canAccessDashboardPath(url, access);
}

function filterSubItemsByAccess(
  subItems: NavSubItem[] | undefined,
  access: UserAccess,
) {
  if (!subItems?.length) {
    return subItems;
  }

  const visibleSubItems = subItems.filter((subItem) =>
    canAccessNavUrl(subItem.url, access),
  );
  return visibleSubItems.length > 0 ? visibleSubItems : undefined;
}

function filterMainItemByAccess(
  item: NavMainItem,
  access: UserAccess,
): NavMainItem | null {
  const visibleSubItems = filterSubItemsByAccess(item.subItems, access);
  const canSeeMain = canAccessNavUrl(item.url, access);

  if (!canSeeMain && !visibleSubItems?.length) {
    return null;
  }

  return {
    ...item,
    subItems: visibleSubItems,
  };
}

export function filterSidebarItemsByAccess(
  items: readonly NavGroup[],
  access: UserAccess,
): NavGroup[] {
  const visibleGroups = items
    .map((group) => {
      const filteredItems = group.items
        .map((item) => filterMainItemByAccess(item, access))
        .filter((item): item is NavMainItem => item !== null);

      return {
        ...group,
        items: filteredItems,
      };
    })
    .filter((group) => group.items.length > 0);

  if (!hasAdminRole(access)) {
    return visibleGroups;
  }

  return visibleGroups.filter(
    (group) => group.labelKey !== "sidebar.group.user",
  );
}
