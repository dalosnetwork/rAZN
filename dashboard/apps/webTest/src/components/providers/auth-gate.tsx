"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/components/providers/language-provider";
import { useMeQuery } from "@/lib/queries/auth";
import {
  canAccessDashboardPath,
  getDefaultDashboardPath,
  type UserAccess,
} from "@/lib/rbac/route-access";

type Props = {
  children: ReactNode;
};

const DEFAULT_AUTHENTICATED_PATH = "/dashboard";
const LOGIN_PATH = "/auth/v1/login";
const UNAUTHORIZED_PATH = "/unauthorized";
const PENDING_APPROVAL_PATH = "/pending-approval";
const EMPTY_ACCESS: UserAccess = {
  roleSlugs: [],
  permissionKeys: [],
};

function isPublicPath(pathname: string) {
  return pathname.startsWith("/auth") || pathname === "/unauthorized";
}

function getSafeInternalPath(pathname: string) {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  return pathname;
}

export function AuthGate({ children }: Props) {
  const { tx } = useI18n();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const meQuery = useMeQuery();

  const isAuthPage = pathname.startsWith("/auth");
  const isPublic = isPublicPath(pathname);
  const isPendingApprovalPage = pathname === PENDING_APPROVAL_PATH;
  const hasUser = Boolean(meQuery.data?.user);
  const access = meQuery.data?.access ?? EMPTY_ACCESS;
  const onboarding = meQuery.data?.onboarding;
  const hasPendingOnboarding = Boolean(
    hasUser && onboarding?.required && !onboarding.isOnboarded,
  );
  const hasDashboardAccess = hasUser
    ? canAccessDashboardPath(pathname, access)
    : true;

  useEffect(() => {
    void meQuery.refetch();
  }, [pathname]);

  useEffect(() => {
    if (!hasPendingOnboarding) {
      return;
    }

    const refreshTimer = window.setInterval(() => {
      void meQuery.refetch();
    }, 15_000);

    return () => window.clearInterval(refreshTimer);
  }, [hasPendingOnboarding, meQuery.refetch]);

  useEffect(() => {
    if (meQuery.isPending) {
      return;
    }

    if (isAuthPage && hasUser) {
      router.replace(
        hasPendingOnboarding
          ? PENDING_APPROVAL_PATH
          : getDefaultDashboardPath(access),
      );
      return;
    }

    if (!isPublic && !hasUser) {
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      const nextPath = getSafeInternalPath(`${pathname}${search}`);
      router.replace(`${LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (hasPendingOnboarding && !isPendingApprovalPage) {
      router.replace(PENDING_APPROVAL_PATH);
      return;
    }

    if (!hasPendingOnboarding && hasUser && isPendingApprovalPage) {
      router.replace(getDefaultDashboardPath(access));
      return;
    }

    if (!isPublic && hasUser && !hasDashboardAccess) {
      router.replace(UNAUTHORIZED_PATH);
    }
  }, [
    hasDashboardAccess,
    hasPendingOnboarding,
    hasUser,
    isPendingApprovalPage,
    access,
    isAuthPage,
    isPublic,
    meQuery.isPending,
    pathname,
    router,
  ]);

  if (meQuery.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner
          className="size-5"
          aria-label={tx("Loading", "Yükleniyor", "Загрузка", "Yüklənir")}
        />
      </div>
    );
  }

  if (
    (isAuthPage && hasUser) ||
    (hasPendingOnboarding && !isPendingApprovalPage) ||
    (isPendingApprovalPage && hasUser && !hasPendingOnboarding) ||
    (!isPublic && (!hasUser || !hasDashboardAccess))
  ) {
    return null;
  }

  return <>{children}</>;
}
