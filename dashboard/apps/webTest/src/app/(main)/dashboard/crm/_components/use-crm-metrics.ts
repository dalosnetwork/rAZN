"use client";

import { useMemo } from "react";

import {
  buildMonthlyRequestFlow,
  buildSpendingByPayoutRail,
  buildWeeklyRequestFlow,
  formatRelativeTime,
  isOpenRequestStatus,
  isRejectedRequestStatus,
  isSuccessfulRequestStatus,
  toCombinedDashboardRequests,
} from "@/app/(main)/dashboard/_lib/dynamic-dashboard-metrics";
import { useDashboardStateQuery } from "@/lib/queries/dashboard";

type CrmRequestRow = {
  id: string;
  type: "mint" | "redeem";
  amount: number;
  status: string;
  source: "bank" | "swift" | "crypto" | "direct";
  lastActivity: string;
};

export function useCrmMetrics(locale: string) {
  const dashboardStateQuery = useDashboardStateQuery();

  const metrics = useMemo(() => {
    const state = dashboardStateQuery.data;
    const requests = toCombinedDashboardRequests(state);
    const now = new Date();
    const monthlyFlow = buildMonthlyRequestFlow(requests, locale, 12);
    const weeklyFlow = buildWeeklyRequestFlow(requests, locale, 6);
    const openRequests = requests.filter((request) =>
      isOpenRequestStatus(request.status),
    );
    const successfulRequests = requests.filter((request) =>
      isSuccessfulRequestStatus(request.status),
    );
    const rejectedRequests = requests.filter((request) =>
      isRejectedRequestStatus(request.status),
    );

    const lastThirtyDaysStart = new Date(now);
    lastThirtyDaysStart.setDate(lastThirtyDaysStart.getDate() - 30);

    const requestsLast30Days = requests.filter(
      (request) => new Date(request.submittedAt) >= lastThirtyDaysStart,
    );

    const settledLast30Days = requests.filter(
      (request) =>
        (isSuccessfulRequestStatus(request.status) ||
          isRejectedRequestStatus(request.status)) &&
        new Date(request.updatedAt) >= lastThirtyDaysStart,
    );

    const railDistribution = buildSpendingByPayoutRail(requests).map((entry) => ({
      source: entry.key,
      value: entry.amount,
      share: entry.share,
    }));

    const statusMap = new Map<string, number>();
    for (const request of requests) {
      statusMap.set(request.status, (statusMap.get(request.status) ?? 0) + 1);
    }

    const stageRows = [
      { stage: "submitted", value: statusMap.get("submitted") ?? 0 },
      { stage: "under_review", value: statusMap.get("under_review") ?? 0 },
      { stage: "processing", value: statusMap.get("processing") ?? 0 },
      { stage: "approved", value: statusMap.get("approved") ?? 0 },
      { stage: "completed", value: statusMap.get("completed") ?? 0 },
    ];

    const countryCounts = new Map<string, number>();
    for (const account of state?.bankAccounts ?? []) {
      countryCounts.set(
        account.country,
        (countryCounts.get(account.country) ?? 0) + 1,
      );
    }

    const totalCountriesTracked = Array.from(countryCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    const countryRows = Array.from(countryCounts.entries())
      .map(([country, count]) => ({
        country,
        count,
        percentage:
          totalCountriesTracked > 0 ? (count / totalCountriesTracked) * 100 : 0,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    const actionItems = [
      ...openRequests
        .sort(
          (left, right) =>
            new Date(left.submittedAt).getTime() -
            new Date(right.submittedAt).getTime(),
        )
        .slice(0, 2)
        .map((request) => ({
          id: request.id,
          title:
            request.type === "mint"
              ? "Review pending mint request"
              : "Review pending redemption request",
          description: request.id,
          due: formatRelativeTime(request.submittedAt, now),
          priority: request.amount > 100_000 ? "high" : "medium",
        })),
      ...(state?.reserveAlerts ?? []).slice(0, 2).map((alert) => ({
        id: alert.id,
        title: "Address reserve alert",
        description: alert.message,
        due: formatRelativeTime(alert.createdAt, now),
        priority: alert.severity === "critical" ? "high" : "low",
      })),
    ].slice(0, 4);

    const recentRequestRows: CrmRequestRow[] = requests.slice(0, 20).map((request) => ({
      id: request.id,
      type: request.type,
      amount: request.amount,
      status: request.status,
      source:
        request.type === "redeem"
          ? (request.payoutRail ?? "bank")
          : "direct",
      lastActivity: formatRelativeTime(request.updatedAt, now),
    }));

    return {
      requests,
      monthlyFlow,
      weeklyFlow,
      openRequests,
      successfulRequests,
      rejectedRequests,
      requestsLast30Days,
      settledLast30Days,
      railDistribution,
      stageRows,
      countryRows,
      actionItems,
      recentRequestRows,
      totalSettledVolume: successfulRequests.reduce(
        (sum, request) => sum + request.amount,
        0,
      ),
    };
  }, [dashboardStateQuery.data, locale]);

  return {
    ...metrics,
    isLoading: dashboardStateQuery.isLoading,
    isError: dashboardStateQuery.isError,
  };
}
