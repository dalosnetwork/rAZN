"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  disableDashboardUser,
  getDashboardUsers,
  updateDashboardUser,
  type DashboardUsersParams,
  type UpdateDashboardUserInput,
} from "@/lib/api/users";

export const usersQueryKeys = {
  dashboardUsers: ["users", "dashboard"] as const,
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
