"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  connectWallet,
  createBankAccount,
  createMintRequest,
  createRedeemRequest,
  disconnectWallet,
  getAdminInstitutionCases,
  getAdminMintOpsQueue,
  getAdminOverviewState,
  getAdminRedemptionOpsQueue,
  getAdminReserveManagementState,
  getAdminWalletState,
  getDashboardState,
  uploadKybDocument,
  updateAdminBankAccountStatus,
  updateAdminInstitutionDocumentStatus,
  updateAdminInstitutionStatus,
  updateAdminMintStatus,
  updateAdminRedemptionStatus,
  updateDashboardSettings,
  setPrimaryWallet,
  type UpdateAdminBankAccountStatusInput,
  type ConnectWalletInput,
  type CreateBankAccountInput,
  type CreateMintRequestInput,
  type CreateRedeemRequestInput,
  type DashboardSettingsPatch,
  type DisconnectWalletInput,
  type UploadKybDocumentInput,
  type SetPrimaryWalletInput,
  type UpdateAdminInstitutionDocumentStatusInput,
  type UpdateAdminInstitutionStatusInput,
  type UpdateAdminMintStatusInput,
  type UpdateAdminRedemptionStatusInput,
} from "@/lib/api/dashboard";

export const dashboardQueryKeys = {
  state: ["dashboard", "state"] as const,
  adminOverview: ["dashboard", "admin", "overview"] as const,
  adminInstitutions: ["dashboard", "admin", "institutions"] as const,
  adminReserveManagement: ["dashboard", "admin", "reserve-management"] as const,
  adminWallet: ["dashboard", "admin", "wallet"] as const,
  adminMintOps: ["dashboard", "admin", "mint-ops"] as const,
  adminRedemptionOps: ["dashboard", "admin", "redemption-ops"] as const,
};

export function useDashboardStateQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.state,
    queryFn: getDashboardState,
    enabled,
  });
}

export function useAdminMintOpsQueueQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.adminMintOps,
    queryFn: getAdminMintOpsQueue,
    enabled,
  });
}

export function useAdminOverviewQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.adminOverview,
    queryFn: getAdminOverviewState,
    enabled,
  });
}

export function useAdminInstitutionsQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.adminInstitutions,
    queryFn: getAdminInstitutionCases,
    enabled,
  });
}

export function useAdminReserveManagementQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.adminReserveManagement,
    queryFn: getAdminReserveManagementState,
    enabled,
  });
}

export function useAdminWalletQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.adminWallet,
    queryFn: getAdminWalletState,
    enabled,
  });
}

export function useAdminRedemptionOpsQueueQuery(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.adminRedemptionOps,
    queryFn: getAdminRedemptionOpsQueue,
    enabled,
  });
}

export function useCreateMintRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateMintRequestInput) => createMintRequest(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.state,
      });
    },
  });
}

export function useCreateRedeemRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRedeemRequestInput) => createRedeemRequest(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.state,
      });
    },
  });
}

export function useUploadKybDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadKybDocumentInput) => uploadKybDocument(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.state,
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.adminInstitutions,
        }),
      ]);
    },
  });
}

export function useUpdateDashboardSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DashboardSettingsPatch) =>
      updateDashboardSettings(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.state,
      });
    },
  });
}

export function useCreateBankAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateBankAccountInput) => createBankAccount(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.state,
      });
    },
  });
}

export function useConnectWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ConnectWalletInput) => connectWallet(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.state,
      });
    },
  });
}

export function useDisconnectWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DisconnectWalletInput) => disconnectWallet(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.state,
      });
    },
  });
}

export function useSetPrimaryWalletMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetPrimaryWalletInput) => setPrimaryWallet(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.state,
      });
    },
  });
}

export function useUpdateAdminInstitutionStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAdminInstitutionStatusInput) =>
      updateAdminInstitutionStatus(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.adminInstitutions,
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.adminOverview,
        }),
      ]);
    },
  });
}

export function useUpdateAdminInstitutionDocumentStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAdminInstitutionDocumentStatusInput) =>
      updateAdminInstitutionDocumentStatus(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.adminInstitutions,
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.adminOverview,
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.state,
        }),
      ]);
    },
  });
}

export function useUpdateAdminBankAccountStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAdminBankAccountStatusInput) =>
      updateAdminBankAccountStatus(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.adminInstitutions,
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.state,
        }),
      ]);
    },
  });
}

export function useUpdateAdminMintStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAdminMintStatusInput) =>
      updateAdminMintStatus(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.adminMintOps,
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.state,
        }),
      ]);
    },
  });
}

export function useUpdateAdminRedemptionStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAdminRedemptionStatusInput) =>
      updateAdminRedemptionStatus(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.adminRedemptionOps,
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.state,
        }),
      ]);
    },
  });
}
