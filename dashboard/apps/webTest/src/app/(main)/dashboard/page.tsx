"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useI18n } from "@/components/providers/language-provider";
import { Spinner } from "@/components/ui/spinner";
import { useMeQuery } from "@/lib/queries/auth";
import { getDefaultDashboardPath } from "@/lib/rbac/route-access";

export default function Page() {
  const { tx } = useI18n();
  const router = useRouter();
  const meQuery = useMeQuery();

  useEffect(() => {
    if (meQuery.isPending || !meQuery.data?.access) {
      return;
    }

    router.replace(getDefaultDashboardPath(meQuery.data.access));
  }, [meQuery.data?.access, meQuery.isPending, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner
        className="size-5"
        aria-label={tx("Loading", "Yükleniyor", "Загрузка", "Yüklənir")}
      />
    </div>
  );
}
