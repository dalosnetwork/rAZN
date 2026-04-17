"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMe,
  login,
  logout,
  register,
  type LoginInput,
  type RegisterInput,
} from "@/lib/api/auth";

export const authQueryKeys = {
  me: ["auth", "me"] as const,
};

export function useMeQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: getMe,
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me });
    },
  });
}
