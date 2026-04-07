"use client";

import { useMemo } from "react";

import {
  buildMonthlyRequestFlow,
  buildSpendingByPayoutRail,
  isOpenRequestStatus,
  median,
  toCombinedDashboardRequests,
} from "@/app/(main)/dashboard/_lib/dynamic-dashboard-metrics";
import { useDashboardStateQuery } from "@/lib/queries/dashboard";

export function useFinanceMetrics(locale: string) {
  const dashboardStateQuery = useDashboardStateQuery();

  const metrics = useMemo(() => {
    const state = dashboardStateQuery.data;
    const requests = toCombinedDashboardRequests(state);
    const monthlyFlow = buildMonthlyRequestFlow(requests, locale, 12);
    const currentMonth = monthlyFlow[monthlyFlow.length - 1];
    const previousMonth = monthlyFlow[monthlyFlow.length - 2];

    const totalWalletBalance =
      state?.walletAddresses.reduce((sum, row) => sum + row.balance, 0) ?? 0;
    const primaryBankAccount =
      state?.bankAccounts.find((row) => row.isPrimary) ?? state?.bankAccounts[0];

    const openRequests = requests.filter((request) =>
      isOpenRequestStatus(request.status),
    );
    const upcomingRequests = [...openRequests]
      .sort(
        (left, right) =>
          new Date(left.submittedAt).getTime() -
          new Date(right.submittedAt).getTime(),
      )
      .slice(0, 4);

    const spendingByRail = buildSpendingByPayoutRail(requests);

    const sixMonthIncome = monthlyFlow.slice(-6).map((point) => point.income);
    const sixMonthTotalIncome = sixMonthIncome.reduce(
      (sum, amount) => sum + amount,
      0,
    );
    const sixMonthAverageIncome =
      sixMonthIncome.length > 0 ? sixMonthTotalIncome / sixMonthIncome.length : 0;
    const sixMonthMedianIncome = median(sixMonthIncome);
    const sixMonthVariance =
      sixMonthIncome.length > 0
        ? sixMonthIncome.reduce(
            (sum, amount) => sum + (amount - sixMonthAverageIncome) ** 2,
            0,
          ) / sixMonthIncome.length
        : 0;
    const sixMonthStdDev = Math.sqrt(sixMonthVariance);
    const incomeReliabilityScore =
      sixMonthAverageIncome > 0
        ? Math.max(0, Math.min(100, 100 - (sixMonthStdDev / sixMonthAverageIncome) * 100))
        : 0;
    const incomeReliabilityLevel =
      incomeReliabilityScore >= 75
        ? "high"
        : incomeReliabilityScore >= 45
          ? "medium"
          : "low";

    const currentMonthIncome = currentMonth?.income ?? 0;
    const currentMonthExpenses = currentMonth?.expenses ?? 0;
    const currentMonthNet = currentMonth?.net ?? 0;
    const previousMonthNet = previousMonth?.net ?? 0;
    const monthOverMonthNetDelta = currentMonthNet - previousMonthNet;
    const monthOverMonthPercent =
      previousMonthNet !== 0
        ? (monthOverMonthNetDelta / Math.abs(previousMonthNet)) * 100
        : 0;
    const savingsRate =
      currentMonthIncome > 0 ? (currentMonthNet / currentMonthIncome) * 100 : 0;
    const savingsRateHistory = monthlyFlow
      .slice(-6)
      .map((point) => (point.income > 0 ? (point.net / point.income) * 100 : 0));
    const averageSavingsRate =
      savingsRateHistory.length > 0
        ? savingsRateHistory.reduce((sum, value) => sum + value, 0) /
          savingsRateHistory.length
        : 0;

    return {
      requests,
      monthlyFlow,
      currentMonthIncome,
      currentMonthExpenses,
      currentMonthNet,
      previousMonthNet,
      monthOverMonthNetDelta,
      monthOverMonthPercent,
      savingsRate,
      averageSavingsRate,
      totalWalletBalance,
      primaryBankAccount,
      walletConnection: state?.walletConnectionSummary,
      upcomingRequests,
      spendingByRail,
      incomeReliabilityLevel,
      incomeReliabilityScore,
      fixedIncomeEstimate: Math.max(0, sixMonthMedianIncome - sixMonthStdDev * 0.25),
      variableIncomeEstimate: Math.max(0, sixMonthAverageIncome - sixMonthMedianIncome),
    };
  }, [dashboardStateQuery.data, locale]);

  return {
    ...metrics,
    isLoading: dashboardStateQuery.isLoading,
    isError: dashboardStateQuery.isError,
  };
}
