"use client";

import { useMemo } from "react";

import {
  buildWeeklyRequestFlow,
  getRequestAgeInDays,
  isOpenRequestStatus,
  isRejectedRequestStatus,
  isSuccessfulRequestStatus,
  median,
  toCombinedDashboardRequests,
  type CombinedDashboardRequest,
} from "@/app/(main)/dashboard/_lib/dynamic-dashboard-metrics";
import { useDashboardStateQuery } from "@/lib/queries/dashboard";

type DateRangeInput = {
  from: Date;
  to: Date;
};

export type RiskLedgerRow = {
  id: string;
  account: string;
  dealId: string;
  stage: string;
  blocker: string;
  owner: string;
  idleDays: number;
  closeVariance: string;
  priority: "Escalate" | "Coach" | "Reforecast" | null;
  nextAction: string;
  riskScore: number;
  amount: number;
};

export function useAnalyticsMetrics(
  locale: string,
  dateRange: DateRangeInput,
) {
  const dashboardStateQuery = useDashboardStateQuery();

  const metrics = useMemo(() => {
    const state = dashboardStateQuery.data;
    const requests = toCombinedDashboardRequests(state);
    const openRequests = requests.filter((request) =>
      isOpenRequestStatus(request.status),
    );
    const owner = state?.settingsProfile.fullName || "Current User";
    const now = new Date();

    const dailySeries = buildDailySeries(requests, dateRange, locale);
    const currentPeriod = summarizeRange(requests, dateRange.from, dateRange.to);

    const periodLengthDays = Math.max(
      1,
      Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );
    const previousTo = new Date(dateRange.from);
    previousTo.setDate(previousTo.getDate() - 1);
    const previousFrom = new Date(previousTo);
    previousFrom.setDate(previousFrom.getDate() - (periodLengthDays - 1));
    const previousPeriod = summarizeRange(requests, previousFrom, previousTo);

    const revenueDelta = currentPeriod.netFlow - previousPeriod.netFlow;
    const revenueDeltaPercent =
      previousPeriod.netFlow !== 0
        ? (revenueDelta / Math.abs(previousPeriod.netFlow)) * 100
        : 0;

    const stalledRequests = openRequests.filter(
      (request) => getRequestAgeInDays(request.submittedAt, now) > 14,
    );
    const revenueAtRisk = stalledRequests.reduce(
      (sum, request) => sum + request.amount,
      0,
    );

    const winRateDelta = currentPeriod.approvalRate - previousPeriod.approvalRate;
    const cycleDrift = currentPeriod.medianOpenAge - previousPeriod.medianOpenAge;

    const weeklyBase = buildWeeklyRequestFlow(requests, locale, 12);
    const averageSubmittedVolume =
      weeklyBase.length > 0
        ? weeklyBase.reduce((sum, row) => sum + row.submittedAmount, 0) /
          weeklyBase.length
        : 0;

    const weeklySeries = weeklyBase.map((row, index) => ({
      period: `W${index + 1}`,
      weekLabel: row.weekLabel,
      submittedVolume: row.submittedAmount,
      settledVolume: row.settledAmount,
      targetVolume: averageSubmittedVolume,
      submittedCount: row.submittedCount,
      settledCount: row.settledCount,
      approvedRate:
        row.settledCount > 0 ? (row.approvedCount / row.settledCount) * 100 : 0,
      openCount: row.openCount,
      deltaLabel:
        averageSubmittedVolume > 0
          ? `${((row.settledAmount - averageSubmittedVolume) / averageSubmittedVolume * 100).toFixed(1)}%`
          : undefined,
    }));

    const latestWeek = weeklySeries[weeklySeries.length - 1];
    const gapAmount = Math.max(
      0,
      (latestWeek?.targetVolume ?? 0) - (latestWeek?.settledVolume ?? 0),
    );
    const averageOpenAmount =
      openRequests.length > 0
        ? openRequests.reduce((sum, row) => sum + row.amount, 0) /
          openRequests.length
        : 0;

    const coverageLevers = [
      {
        key: "deal",
        label: "+1 high-value settlement",
        value: `+${Math.round(averageOpenAmount).toLocaleString(locale)}`,
        context: `${Math.min(100, gapAmount > 0 ? (averageOpenAmount / gapAmount) * 100 : 0).toFixed(0)}% of gap`,
      },
      {
        key: "conversion",
        label: "+5pp approval rate",
        value: `+${Math.round(currentPeriod.submittedVolume * 0.05).toLocaleString(locale)}`,
        context: `${Math.min(100, gapAmount > 0 ? (currentPeriod.submittedVolume * 0.05 / gapAmount) * 100 : 0).toFixed(0)}% of gap`,
      },
      {
        key: "cycle",
        label: "-4d processing cycle",
        value: `+${Math.round(currentPeriod.submittedVolume * 0.08).toLocaleString(locale)}`,
        context: `${Math.min(100, gapAmount > 0 ? (currentPeriod.submittedVolume * 0.08 / gapAmount) * 100 : 0).toFixed(0)}% of gap`,
      },
    ];

    const riskLedgerRows = buildRiskLedgerRows(openRequests, owner, now);
    const nextInterventions = riskLedgerRows
      .filter((row) => row.priority)
      .slice(0, 3)
      .map((row) => ({
        dealId: row.dealId,
        priority: row.priority ?? "Coach",
        owner: row.owner,
        risk: row.riskScore,
        recommendation: row.nextAction,
      }));

    const interventionTotals = {
      escalate: riskLedgerRows.filter((row) => row.priority === "Escalate"),
      coach: riskLedgerRows.filter((row) => row.priority === "Coach"),
      reforecast: riskLedgerRows.filter((row) => row.priority === "Reforecast"),
      monitor: riskLedgerRows.filter((row) => row.priority === null),
    };

    return {
      dailySeries,
      summary: {
        currentNetFlow: currentPeriod.netFlow,
        previousNetFlow: previousPeriod.netFlow,
        revenueDelta,
        revenueDeltaPercent,
        stalledCount: stalledRequests.length,
        revenueAtRisk,
        winRateDelta,
        cycleDrift,
      },
      weeklySeries,
      latestWeek,
      coverage: {
        gapAmount,
        openDeals: openRequests.length,
        leverage: coverageLevers,
        owner,
      },
      managerQueue: {
        nextInterventions,
        actionableDeals: riskLedgerRows.filter((row) => row.priority).length,
        revenueInPlay: openRequests.reduce((sum, row) => sum + row.amount, 0),
        ownersEngaged: 1,
        medianRisk: median(riskLedgerRows.map((row) => row.riskScore)),
        interventionTotals,
      },
      riskLedgerRows,
      requestCount: requests.length,
    };
  }, [dashboardStateQuery.data, dateRange.from, dateRange.to, locale]);

  return {
    ...metrics,
    isLoading: dashboardStateQuery.isLoading,
    isError: dashboardStateQuery.isError,
  };
}

function buildDailySeries(
  requests: CombinedDashboardRequest[],
  range: DateRangeInput,
  locale: string,
) {
  const start = startOfDay(range.from);
  const end = startOfDay(range.to);
  const points: Array<{ day: string; dateKey: string; revenue: number }> = [];
  const valuesByDay = new Map<string, number>();

  let cursor = new Date(start);
  while (cursor <= end) {
    const key = toDateKey(cursor);
    valuesByDay.set(key, 0);
    points.push({
      day: cursor.toLocaleDateString(locale, { month: "short", day: "numeric" }),
      dateKey: key,
      revenue: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const request of requests) {
    const requestDate = startOfDay(new Date(request.submittedAt));
    if (requestDate < start || requestDate > end) {
      continue;
    }

    const key = toDateKey(requestDate);
    const current = valuesByDay.get(key) ?? 0;
    const signedAmount = request.type === "mint" ? request.amount : -request.amount;
    valuesByDay.set(key, current + signedAmount);
  }

  let running = 0;
  return points.map((point) => {
    running += valuesByDay.get(point.dateKey) ?? 0;
    return {
      day: point.day,
      revenue: running,
    };
  });
}

function summarizeRange(
  requests: CombinedDashboardRequest[],
  from: Date,
  to: Date,
) {
  const start = startOfDay(from);
  const end = endOfDay(to);
  const rows = requests.filter((request) => {
    const submittedAt = new Date(request.submittedAt);
    return submittedAt >= start && submittedAt <= end;
  });

  const successful = rows.filter((request) =>
    isSuccessfulRequestStatus(request.status),
  );
  const settled = rows.filter(
    (request) =>
      isSuccessfulRequestStatus(request.status) ||
      isRejectedRequestStatus(request.status),
  );
  const open = rows.filter((request) => isOpenRequestStatus(request.status));

  const netFlow = successful.reduce(
    (sum, request) =>
      sum + (request.type === "mint" ? request.amount : -request.amount),
    0,
  );

  return {
    rows,
    netFlow,
    submittedVolume: rows.reduce((sum, row) => sum + row.amount, 0),
    approvalRate:
      settled.length > 0 ? (successful.length / settled.length) * 100 : 0,
    medianOpenAge: median(open.map((request) => getRequestAgeInDays(request.submittedAt))),
  };
}

function buildRiskLedgerRows(
  requests: CombinedDashboardRequest[],
  owner: string,
  now: Date,
): RiskLedgerRow[] {
  return [...requests]
    .sort(
      (left, right) =>
        getRequestAgeInDays(right.submittedAt, now) -
        getRequestAgeInDays(left.submittedAt, now),
    )
    .slice(0, 12)
    .map((request, index) => {
      const idleDays = getRequestAgeInDays(request.submittedAt, now);
      const riskFromAge = Math.min(50, idleDays * 2);
      const riskFromAmount = Math.min(50, request.amount / 10_000);
      const riskScore = Math.min(99, Math.round(riskFromAge + riskFromAmount));

      let priority: RiskLedgerRow["priority"] = null;
      if (riskScore >= 80) {
        priority = "Escalate";
      } else if (riskScore >= 60) {
        priority = "Coach";
      } else if (riskScore >= 45) {
        priority = "Reforecast";
      }

      const nextAction =
        priority === "Escalate"
          ? "Escalate to operations lead and set explicit closure owner."
          : priority === "Coach"
            ? "Review status blockers and assign a same-day next action."
            : priority === "Reforecast"
              ? "Update timeline expectations and adjust queue priority."
              : "No immediate intervention required.";

      return {
        id: `${request.id}-${index}`,
        account: request.destination || "N/A",
        dealId: request.id,
        stage: request.status,
        blocker: `${idleDays}d without final state`,
        owner,
        idleDays,
        closeVariance: `${idleDays}d open`,
        priority,
        nextAction,
        riskScore,
        amount: request.amount,
      };
    });
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}
