"use client";

import * as React from "react";

import { toast } from "sonner";

import { MvpDetailDrawer } from "@/app/(main)/dashboard/_mvp/components/detail-drawer";
import {
  formatDateTime,
  formatNumber,
} from "@/app/(main)/dashboard/_mvp/components/formatters";
import { MvpKpiCard } from "@/app/(main)/dashboard/_mvp/components/kpi-card";
import { MvpPageHeader } from "@/app/(main)/dashboard/_mvp/components/page-header";
import { MvpSectionCard } from "@/app/(main)/dashboard/_mvp/components/section-card";
import {
  MvpSimpleTable,
  type MvpTableColumn,
} from "@/app/(main)/dashboard/_mvp/components/simple-table";
import {
  MvpErrorAlert,
  MvpInlineLoading,
} from "@/app/(main)/dashboard/_mvp/components/state-blocks";
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";
import { MvpTableToolbar } from "@/app/(main)/dashboard/_mvp/components/table-toolbar";
import type { MvpStatus } from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardRole } from "@/lib/api/users";
import {
  useDashboardPermissionsQuery,
  useDashboardRolesQuery,
  useDashboardUsersQuery,
  useDisableDashboardUserMutation,
  useUpdateDashboardRolePermissionsMutation,
  useUpdateDashboardUserMutation,
} from "@/lib/queries/users";

const ADMIN_ROLE_SLUGS = [
  "super_admin",
  "compliance_officer",
  "treasurer",
  "risk_officer",
  "redemption_officer",
] as const;
const ADMIN_ROLE_SLUG_SET = new Set<string>(ADMIN_ROLE_SLUGS);

type AdminRoleOption = {
  slug: string;
  label: string;
  permissionCount: number;
  permissions: string;
  permissionKeys: string[];
  scope: string;
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  roleSlug: string;
  roleLabel: string;
  roleSlugs: string[];
  status: MvpStatus;
  lastActiveAt: string;
};

type AdminRoleRow = {
  id: string;
  role: string;
  members: number;
  permissions: string;
  scope: string;
};

type RolePolicyEditorState = {
  roleSlug: string;
  permissionKeys: string[];
};

function toScope(slug: string) {
  if (slug === "super_admin") {
    return "Platform-wide";
  }
  if (slug === "compliance_officer") {
    return "Compliance";
  }
  if (slug === "treasurer") {
    return "Treasury";
  }
  if (slug === "risk_officer") {
    return "Risk";
  }
  if (slug === "redemption_officer") {
    return "Redemption";
  }
  return "Operations";
}

function toRoleOptions(
  roles: DashboardRole[],
  permissionNameByKey: Map<string, string>,
): AdminRoleOption[] {
  return roles
    .filter((role) => ADMIN_ROLE_SLUG_SET.has(role.slug))
    .map((role) => {
      const preview = role.permissionKeys
        .slice(0, 4)
        .map((key) => permissionNameByKey.get(key) ?? key)
        .join(", ");

      return {
        slug: role.slug,
        label: role.name,
        permissionCount: role.permissionKeys.length,
        permissions: preview,
        permissionKeys: role.permissionKeys,
        scope: toScope(role.slug),
      };
    });
}

function toStatus(input: {
  deletedAt: string | null;
  emailVerified: boolean;
}): MvpStatus {
  if (input.deletedAt) {
    return "inactive";
  }
  if (!input.emailVerified) {
    return "under_review";
  }
  return "active";
}

function pickPrimaryAdminRole(roleSlugs: string[]) {
  const preferredOrder = [
    "super_admin",
    "compliance_officer",
    "treasurer",
    "risk_officer",
    "redemption_officer",
  ];

  const role = preferredOrder.find((slug) => roleSlugs.includes(slug));
  return role ?? roleSlugs[0] ?? "super_admin";
}

function buildAdminColumns(
  onOpen: (admin: AdminUser) => void,
  tt: (en: string) => string,
): MvpTableColumn<AdminUser>[] {
  return [
    {
      id: "id",
      header: tt("Admin ID"),
      cell: (row) => row.id,
    },
    {
      id: "name",
      header: tt("Admin name"),
      cell: (row) => row.name,
    },
    {
      id: "email",
      header: tt("Email"),
      cell: (row) => row.email,
    },
    {
      id: "role",
      header: tt("Role"),
      cell: (row) => row.roleLabel,
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "lastActiveAt",
      header: tt("Last active"),
      cell: (row) => formatDateTime(row.lastActiveAt),
    },
    {
      id: "details",
      header: tt("Details"),
      className: "text-right",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => onOpen(row)}>
          {tt("Open")}
        </Button>
      ),
    },
  ];
}

function buildRoleColumns(
  tt: (en: string) => string,
  onManage: (role: AdminRoleRow) => void,
): MvpTableColumn<AdminRoleRow>[] {
  return [
    {
      id: "role",
      header: tt("Role"),
      cell: (row) => row.role,
    },
    {
      id: "members",
      header: tt("Members"),
      className: "text-right",
      cell: (row) => formatNumber(row.members),
    },
    {
      id: "permissions",
      header: tt("Permissions"),
      cell: (row) => row.permissions,
    },
    {
      id: "scope",
      header: tt("Scope"),
      cell: (row) => row.scope,
    },
    {
      id: "manage",
      header: tt("Manage"),
      className: "text-right",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => onManage(row)}>
          {tt("Manage role")}
        </Button>
      ),
    },
  ];
}

export default function Page() {
  const { tt } = useI18n();

  const usersQuery = useDashboardUsersQuery(
    {
      page: 1,
      pageSize: 50,
      sortBy: "createdAt",
      sortDir: "desc",
    },
    true,
  );
  const rolesQuery = useDashboardRolesQuery(true);
  const permissionsQuery = useDashboardPermissionsQuery(true);

  const updateUserMutation = useUpdateDashboardUserMutation();
  const disableUserMutation = useDisableDashboardUserMutation();
  const updateRolePermissionsMutation = useUpdateDashboardRolePermissionsMutation();

  const [search, setSearch] = React.useState("");
  const [selectedAdmin, setSelectedAdmin] = React.useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = React.useState("");
  const [policyEditor, setPolicyEditor] =
    React.useState<RolePolicyEditorState | null>(null);

  const permissionCatalog = permissionsQuery.data ?? [];
  const permissionNameByKey = React.useMemo(
    () => new Map(permissionCatalog.map((permission) => [permission.key, permission.name])),
    [permissionCatalog],
  );

  const roleOptions = React.useMemo(
    () => toRoleOptions(rolesQuery.data ?? [], permissionNameByKey),
    [permissionNameByKey, rolesQuery.data],
  );

  const admins = React.useMemo<AdminUser[]>(() => {
    const rows = usersQuery.data?.rows ?? [];
    return rows
      .filter((user) => user.roles.some((slug) => ADMIN_ROLE_SLUG_SET.has(slug)))
      .map((user) => {
        const primaryRoleSlug = pickPrimaryAdminRole(user.roles);
        const role = roleOptions.find((entry) => entry.slug === primaryRoleSlug);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roleSlug: primaryRoleSlug,
          roleLabel: role?.label ?? primaryRoleSlug,
          roleSlugs: user.roles,
          status: toStatus({
            deletedAt: user.deletedAt,
            emailVerified: user.emailVerified,
          }),
          lastActiveAt: user.updatedAt,
        };
      });
  }, [roleOptions, usersQuery.data?.rows]);

  const filteredAdmins = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return admins.filter((admin) => {
      if (query.length === 0) {
        return true;
      }
      return (
        admin.id.toLowerCase().includes(query) ||
        admin.name.toLowerCase().includes(query) ||
        admin.email.toLowerCase().includes(query)
      );
    });
  }, [admins, search]);

  const activeAdmins = admins.filter((admin) => admin.status === "active").length;

  const roleRows = React.useMemo<AdminRoleRow[]>(() => {
    return roleOptions.map((role) => ({
      id: role.slug,
      role: role.label,
      members: admins.filter((admin) => admin.roleSlugs.includes(role.slug)).length,
      permissions: role.permissions || `${role.permissionCount} permissions`,
      scope: role.scope,
    }));
  }, [admins, roleOptions]);

  const selectedManagedRole = React.useMemo(() => {
    if (!policyEditor) {
      return null;
    }
    return roleOptions.find((role) => role.slug === policyEditor.roleSlug) ?? null;
  }, [policyEditor, roleOptions]);

  React.useEffect(() => {
    setSelectedRole(selectedAdmin?.roleSlug ?? "");
  }, [selectedAdmin]);

  const adminColumns = React.useMemo(
    () => buildAdminColumns(setSelectedAdmin, tt),
    [tt],
  );
  const roleColumns = React.useMemo(
    () =>
      buildRoleColumns(tt, (role) => {
        const nextRole = roleOptions.find((option) => option.slug === role.id);
        if (!nextRole) {
          toast.error(tt("Role definition was not found."));
          return;
        }

        setPolicyEditor({
          roleSlug: nextRole.slug,
          permissionKeys: [...nextRole.permissionKeys],
        });
      }),
    [roleOptions, tt],
  );

  const isRoleDataLoading = rolesQuery.isLoading || permissionsQuery.isLoading;
  const roleDataError = rolesQuery.error ?? permissionsQuery.error;

  async function saveAdminRole() {
    if (!selectedAdmin || !selectedRole) {
      return;
    }

    try {
      await updateUserMutation.mutateAsync({
        userId: selectedAdmin.id,
        input: {
          roleSlugs: [selectedRole],
        },
      });
      await usersQuery.refetch();
      toast.success(tt("Admin role updated."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not update admin role."),
      );
    }
  }

  async function disableAdminUser() {
    if (!selectedAdmin) {
      return;
    }

    try {
      await disableUserMutation.mutateAsync(selectedAdmin.id);
      await usersQuery.refetch();
      setSelectedAdmin(null);
      toast.success(tt("Admin account disabled."));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tt("Could not disable admin."),
      );
    }
  }

  function toggleRolePermission(permissionKey: string, nextChecked: boolean) {
    setPolicyEditor((current) => {
      if (!current) {
        return current;
      }

      const permissionKeySet = new Set(current.permissionKeys);
      if (nextChecked) {
        permissionKeySet.add(permissionKey);
      } else {
        permissionKeySet.delete(permissionKey);
      }

      return {
        ...current,
        permissionKeys: Array.from(permissionKeySet).sort((a, b) =>
          a.localeCompare(b),
        ),
      };
    });
  }

  async function saveRolePolicies() {
    if (!policyEditor) {
      return;
    }

    if (policyEditor.roleSlug === "super_admin") {
      toast.info(tt("Super admin policies are fixed."));
      return;
    }

    try {
      await updateRolePermissionsMutation.mutateAsync({
        roleSlug: policyEditor.roleSlug,
        permissionKeys: policyEditor.permissionKeys,
      });
      await rolesQuery.refetch();
      toast.success(tt("Role permissions updated."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not update role permissions."),
      );
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Admin & Role Management")}
        description={tt("Add and manage admins, and maintain role-based admin access.")}
        actions={
          <Button
            variant="outline"
            onClick={() => {
              toast.info(tt("Use registration flow to create new admin users."));
            }}
          >
            {tt("Add admin")}
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MvpKpiCard
          label={tt("Total admins")}
          value={formatNumber(admins.length)}
          hint={tt("All admin users in workspace")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Active admins")}
          value={formatNumber(activeAdmins)}
          hint={tt("Admins with active access")}
          status="approved"
        />
      </section>

      <MvpSectionCard
        title={tt("Add & manage admins")}
        description={tt("Review admin users, update roles, and inspect account details.")}
        contentClassName="space-y-4"
      >
        <MvpTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tt("Search admin ID, name, or email")}
        />
        {usersQuery.isLoading ? <MvpInlineLoading /> : null}
        {usersQuery.error ? (
          <MvpErrorAlert
            title={tt("Could not load admins")}
            description={usersQuery.error.message}
          />
        ) : null}
        {!usersQuery.isLoading && !usersQuery.error ? (
          <MvpSimpleTable
            columns={adminColumns}
            data={filteredAdmins}
            getRowId={(row) => row.id}
            emptyTitle={tt("No admin users")}
            emptyDescription={tt("No admin accounts match the selected filters.")}
          />
        ) : null}
      </MvpSectionCard>

      <MvpSectionCard
        title={tt("Manage admin roles")}
        description={tt("Review available roles, scope, and permission coverage.")}
      >
        {isRoleDataLoading ? <MvpInlineLoading /> : null}
        {roleDataError ? (
          <MvpErrorAlert
            title={tt("Could not load admin roles")}
            description={roleDataError.message}
          />
        ) : null}
        {!isRoleDataLoading && !roleDataError ? (
          <MvpSimpleTable
            columns={roleColumns}
            data={roleRows}
            getRowId={(row) => row.id}
            emptyTitle={tt("No admin roles")}
            emptyDescription={tt("Role definitions will appear here.")}
          />
        ) : null}
      </MvpSectionCard>

      <MvpDetailDrawer
        open={Boolean(selectedAdmin)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAdmin(null);
          }
        }}
        title={selectedAdmin ? `${selectedAdmin.name}` : "Admin details"}
        description={selectedAdmin ? selectedAdmin.email : undefined}
        footer={
          selectedAdmin ? (
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => void saveAdminRole()}
                disabled={updateUserMutation.isPending}
              >
                {tt("Save changes")}
              </Button>
              {selectedAdmin.roleSlug !== "super_admin" ? (
                <Button
                  variant="outline"
                  onClick={() => void disableAdminUser()}
                  disabled={disableUserMutation.isPending}
                >
                  {tt("Disable admin")}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      >
        {selectedAdmin ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">{tt("Admin ID")}</p>
              <p className="font-medium">{selectedAdmin.id}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Status")}</p>
              <StatusBadge status={selectedAdmin.status} />
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">{tt("Manage admin roles")}</p>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder={tt("Select role")} />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </MvpDetailDrawer>

      <MvpDetailDrawer
        open={Boolean(policyEditor)}
        onOpenChange={(open) => {
          if (!open) {
            setPolicyEditor(null);
          }
        }}
        title={selectedManagedRole?.label ?? tt("Role policies")}
        description={tt("Attach or detach predefined policies for this role.")}
        footer={
          policyEditor ? (
            <Button
              onClick={() => void saveRolePolicies()}
              disabled={
                policyEditor.roleSlug === "super_admin" ||
                updateRolePermissionsMutation.isPending
              }
            >
              {tt("Save changes")}
            </Button>
          ) : null
        }
      >
        {policyEditor ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">{tt("Role")}</p>
              <p className="font-medium">{selectedManagedRole?.label ?? policyEditor.roleSlug}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">{tt("Assigned policies")}</p>
              <p className="font-medium">{formatNumber(policyEditor.permissionKeys.length)}</p>
            </div>
            {policyEditor.roleSlug === "super_admin" ? (
              <p className="text-muted-foreground text-xs">
                {tt("Super admin policies are fixed and cannot be changed.")}
              </p>
            ) : null}
            <div className="space-y-2">
              {permissionCatalog.length > 0 ? (
                permissionCatalog.map((permission) => {
                  const checked = policyEditor.permissionKeys.includes(permission.key);
                  const inputId = `role-policy-${policyEditor.roleSlug}-${permission.key}`;

                  return (
                    <label
                      key={permission.key}
                      htmlFor={inputId}
                      className="flex cursor-pointer items-start gap-2 rounded-md border bg-background p-2"
                    >
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        disabled={
                          policyEditor.roleSlug === "super_admin" ||
                          updateRolePermissionsMutation.isPending
                        }
                        onCheckedChange={(nextChecked) =>
                          toggleRolePermission(permission.key, nextChecked === true)
                        }
                      />
                      <span className="space-y-0.5">
                        <span className="block font-medium">{permission.name}</span>
                        <span className="text-muted-foreground block text-xs">
                          {permission.key}
                          {permission.description ? ` - ${permission.description}` : ""}
                        </span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-xs">{tt("No policies available.")}</p>
              )}
            </div>
          </div>
        ) : null}
      </MvpDetailDrawer>
    </div>
  );
}
