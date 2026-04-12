"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getDashboardPermissions,
  getDashboardRoles,
  disableDashboardUser,
  getDashboardUsers,
  updateDashboardRolePermissions,
  updateDashboardUser,
  type DashboardRole,
  type DashboardUsersParams,
  type UpdateDashboardUserInput,
} from "@/lib/api/users";

export const usersQueryKeys = {
  dashboardUsers: ["users", "dashboard"] as const,
  dashboardPermissions: ["users", "dashboard", "permissions"] as const,
  dashboardRoles: ["users", "dashboard", "roles"] as const,
};

export function useDashboardUsersQuery(
  params: DashboardUsersParams,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      ...usersQueryKeys.dashboardUsers,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortDir,
    ],
    queryFn: () => getDashboardUsers(params),
    enabled,
  });
}

export function useUpdateDashboardUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      input,
    }: {
      userId: string;
      input: UpdateDashboardUserInput;
    }) => updateDashboardUser(userId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: usersQueryKeys.dashboardUsers,
      });
    },
  });
}

export function useDisableDashboardUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => disableDashboardUser(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: usersQueryKeys.dashboardUsers,
      });
    },
  });
}

export function useDashboardPermissionsQuery(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.dashboardPermissions,
    queryFn: getDashboardPermissions,
    enabled,
  });
}

export function useDashboardRolesQuery(enabled = true) {
  return useQuery({
    queryKey: usersQueryKeys.dashboardRoles,
    queryFn: getDashboardRoles,
    enabled,
  });
}

export function useUpdateDashboardRolePermissionsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleSlug,
      permissionKeys,
    }: {
      roleSlug: string;
      permissionKeys: string[];
    }) => updateDashboardRolePermissions(roleSlug, { permissionKeys }),
    onSuccess: async (updatedRole: DashboardRole) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: usersQueryKeys.dashboardRoles,
        }),
        queryClient.invalidateQueries({
          queryKey: usersQueryKeys.dashboardUsers,
        }),
      ]);

      queryClient.setQueryData<DashboardRole[] | undefined>(
        usersQueryKeys.dashboardRoles,
        (current) =>
          current?.map((role) =>
            role.slug === updatedRole.slug ? updatedRole : role,
          ),
      );
    },
  });
}
