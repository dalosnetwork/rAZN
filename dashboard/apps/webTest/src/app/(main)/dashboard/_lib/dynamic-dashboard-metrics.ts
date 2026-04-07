import type { DashboardStatePayload } from "@/lib/api/dashboard";

const OPEN_REQUEST_STATUSES = new Set([
  "draft",
  "submitted",
  "under_review",
  "queued",
  "processing",
  "pending",
  "in_progress",
]);

const SUCCESS_REQUEST_STATUSES = new Set(["approved", "completed", "verified"]);
const REJECTED_REQUEST_STATUSES = new Set(["rejected", "blocked", "inactive"]);

export type CombinedDashboardRequest = {
  id: string;
  type: "mint" | "redeem";
  amount: number;
  status: DashboardStatePayload["mintRequests"][number]["status"];
  submittedAt: string;
  updatedAt: string;
  destination: string;
  payoutRail?: "bank" | "swift" | "crypto";
};

export type MonthlyRequestFlowPoint = {
  key: string;
  monthStart: Date;
  monthLabel: string;
  income: number;
  expenses: number;
  net: number;
  submittedCount: number;
  settledCount: number;
  rejectedCount: number;
};

export type WeeklyRequestFlowPoint = {
  key: string;
  weekStart: Date;
  weekLabel: string;
  submittedAmount: number;
  settledAmount: number;
  submittedCount: number;
  settledCount: number;
  approvedCount: number;
  rejectedCount: number;
  openCount: number;
};

export function toCombinedDashboardRequests(
  state: DashboardStatePayload | undefined,
): CombinedDashboardRequest[] {
  if (!state) {
    return [];
  }

  const mintRequests = state.mintRequests.map((request) => ({
    id: request.requestId,
    type: "mint" as const,
    amount: request.amount,
    status: request.status,
    submittedAt: request.submittedAt,
    updatedAt: request.updatedAt,
    destination: request.destination,
  }));

  const redeemRequests = state.redeemRequests.map((request) => ({
    id: request.requestId,
    type: "redeem" as const,
    amount: request.amount,
    status: request.status,
    submittedAt: request.createdAt,
    updatedAt: request.updatedAt,
    destination: request.destination,
    payoutRail: request.payoutRail,
  }));

  return [...mintRequests, ...redeemRequests].sort(
    (left, right) =>
      toDate(right.submittedAt).getTime() - toDate(left.submittedAt).getTime(),
  );
}

export function isOpenRequestStatus(status: string) {
  return OPEN_REQUEST_STATUSES.has(status);
}

export function isSuccessfulRequestStatus(status: string) {
  return SUCCESS_REQUEST_STATUSES.has(status);
}

export function isRejectedRequestStatus(status: string) {
  return REJECTED_REQUEST_STATUSES.has(status);
}

export function buildMonthlyRequestFlow(
  requests: CombinedDashboardRequest[],
  locale: string,
  monthCount = 12,
): MonthlyRequestFlowPoint[] {
  const start = startOfMonthOffset(new Date(), -(monthCount - 1));
  const months: MonthlyRequestFlowPoint[] = [];

  for (let index = 0; index < monthCount; index += 1) {
    const monthStart = startOfMonthOffset(start, index);
    const key = formatMonthKey(monthStart);
    months.push({
      key,
      monthStart,
      monthLabel: monthStart.toLocaleDateString(locale, { month: "short" }),
      income: 0,
      expenses: 0,
      net: 0,
      submittedCount: 0,
      settledCount: 0,
      rejectedCount: 0,
    });
  }

  const indexByKey = new Map(months.map((month, index) => [month.key, index]));

  for (const request of requests) {
    const requestDate = toDate(request.submittedAt);
    const key = formatMonthKey(requestDate);
    const bucketIndex = indexByKey.get(key);

    if (bucketIndex === undefined) {
      continue;
    }

    const bucket = months[bucketIndex];
    bucket.submittedCount += 1;

    if (request.type === "mint") {
      bucket.income += request.amount;
    } else {
      bucket.expenses += request.amount;
    }

    if (isSuccessfulRequestStatus(request.status)) {
      bucket.settledCount += 1;
    }

    if (isRejectedRequestStatus(request.status)) {
      bucket.rejectedCount += 1;
    }
  }

  for (const bucket of months) {
    bucket.net = bucket.income - bucket.expenses;
  }

  return months;
}

export function buildWeeklyRequestFlow(
  requests: CombinedDashboardRequest[],
  locale: string,
  weekCount = 12,
): WeeklyRequestFlowPoint[] {
  const start = startOfWeekOffset(new Date(), -(weekCount - 1));
  const weeks: WeeklyRequestFlowPoint[] = [];

  for (let index = 0; index < weekCount; index += 1) {
    const weekStart = startOfWeekOffset(start, index);
    const key = formatWeekKey(weekStart);
    weeks.push({
      key,
      weekStart,
      weekLabel: weekStart.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      }),
      submittedAmount: 0,
      settledAmount: 0,
      submittedCount: 0,
      settledCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      openCount: 0,
    });
  }

  const indexByKey = new Map(weeks.map((week, index) => [week.key, index]));

  for (const request of requests) {
    const submittedKey = formatWeekKey(toDate(request.submittedAt));
    const submittedWeekIndex = indexByKey.get(submittedKey);

    if (submittedWeekIndex !== undefined) {
      const bucket = weeks[submittedWeekIndex];
      bucket.submittedCount += 1;
      bucket.submittedAmount += request.amount;
    }

    if (isSuccessfulRequestStatus(request.status) || isRejectedRequestStatus(request.status)) {
      const settledKey = formatWeekKey(toDate(request.updatedAt));
      const settledWeekIndex = indexByKey.get(settledKey);
      if (settledWeekIndex !== undefined) {
        const bucket = weeks[settledWeekIndex];
        bucket.settledCount += 1;
        bucket.settledAmount += request.amount;

        if (isSuccessfulRequestStatus(request.status)) {
          bucket.approvedCount += 1;
        } else if (isRejectedRequestStatus(request.status)) {
          bucket.rejectedCount += 1;
        }
      }
    }
  }

  let openRunningCount = 0;
  for (const bucket of weeks) {
    openRunningCount += bucket.submittedCount - bucket.settledCount;
    bucket.openCount = Math.max(0, openRunningCount);
  }

  return weeks;
}

export function buildSpendingByPayoutRail(requests: CombinedDashboardRequest[]) {
  const totals = {
    bank: 0,
    swift: 0,
    crypto: 0,
  };

  for (const request of requests) {
    if (request.type !== "redeem") {
      continue;
    }
    const key = request.payoutRail ?? "bank";
    totals[key] += request.amount;
  }

  const grandTotal = totals.bank + totals.swift + totals.crypto;

  return (["bank", "swift", "crypto"] as const).map((key) => ({
    key,
    amount: totals[key],
    share: grandTotal > 0 ? (totals[key] / grandTotal) * 100 : 0,
  }));
}

export function formatRelativeTime(isoDate: string, now = new Date()) {
  const diffMs = Math.max(0, now.getTime() - toDate(isoDate).getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    return `${Math.max(1, Math.floor(diffMs / minute))}m ago`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }
  return `${Math.floor(diffMs / day)}d ago`;
}

export function getRequestAgeInDays(isoDate: string, now = new Date()) {
  const diffMs = Math.max(0, now.getTime() - toDate(isoDate).getTime());
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function startOfMonthOffset(base: Date, offset: number) {
  return new Date(base.getFullYear(), base.getMonth() + offset, 1);
}

function startOfWeekOffset(base: Date, offset: number) {
  const shifted = new Date(base);
  shifted.setDate(shifted.getDate() + offset * 7);
  return startOfWeek(shifted);
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatWeekKey(date: Date) {
  const start = startOfWeek(date);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(
    start.getDate(),
  ).padStart(2, "0")}`;
}

function toDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0);
  }
  return parsed;
}
