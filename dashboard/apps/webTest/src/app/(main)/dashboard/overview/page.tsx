"use client";

import * as React from "react";

import Link from "next/link";

import { ArrowRightIcon } from "lucide-react";
import { Area, AreaChart, XAxis } from "recharts";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useDashboardStateQuery } from "@/lib/queries/dashboard";

import {
  formatCurrency,
  formatDateTime,
  formatPercent,
} from "@/app/(main)/dashboard/_mvp/components/formatters";
import { MvpKpiCard } from "@/app/(main)/dashboard/_mvp/components/kpi-card";
import { MvpPageHeader } from "@/app/(main)/dashboard/_mvp/components/page-header";
import { MvpSectionCard } from "@/app/(main)/dashboard/_mvp/components/section-card";
import {
  MvpSimpleTable,
  type MvpTableColumn,
} from "@/app/(main)/dashboard/_mvp/components/simple-table";
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";

import type { OverviewActivity } from "@/app/(main)/dashboard/_mvp/types";

const HOLDINGS_TODAY_MOCK = [
  { time: "04.04", holdings: 14.8 },
  { time: "05.04", holdings: 95.2 },
  { time: "09.04", holdings: 45.9 },
  { time: "10.04", holdings: 106.6 },
  { time: "11.04", holdings: 196.1 },
  { time: "12.04", holdings: 26.9 },
  { time: "13.04", holdings: 37.4 },
  { time: "14.04", holdings: 77.0 },
  { time: "15.04", holdings: 17.8 },
  { time: "16.04", holdings: 8.4 },
  { time: "17.04", holdings: 18.0 },
  { time: "18.04", holdings: 18.9 },
  { time: "19.04", holdings: 19.3 },
  { time: "20.04", holdings: 99.0 },
  { time: "21.04", holdings: 89.6 },
];

function HoldingsTodayMockChart() {
  const { tt } = useI18n();
  const chartConfig = React.useMemo<ChartConfig>(
    () => ({
      holdings: {
        label: tt("Holdings"),
        color: "var(--primary)",
      },
    }),
    [tt],
  );

  return (
    <div className="h-full w-full overflow-hidden p-4">
      <ChartContainer
        config={chartConfig}
        className="h-full w-full min-h-0 overflow-hidden p-0 aspect-auto"
      >
        <AreaChart
          accessibilityLayer
          data={HOLDINGS_TODAY_MOCK}
          margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
        >
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={20}
            interval="preserveStartEnd"
            className="text-[10px]"
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
            cursor={false}
          />
          <Area
            type="monotone"
            dataKey="holdings"
            stroke="var(--color-holdings)"
            strokeWidth={2.4}
            fill="var(--color-holdings)"
            fillOpacity={0.12}
            dot={{ r: 2.2, fill: "var(--color-holdings)", strokeWidth: 0 }}
            activeDot={{ r: 3.8, fill: "var(--color-holdings)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

export default function Page() {
  const { tt } = useI18n();
  const dashboardStateQuery = useDashboardStateQuery();
  const overviewCards = dashboardStateQuery.data?.overviewCards ?? {
    holdings: 0,
    pendingRequests: 0,
    kybStatus: "not_started",
    reserveCoverage: 0,
    latestActivityAt: new Date(0).toISOString(),
    blockers: 0,
  };
  const overviewActivities = dashboardStateQuery.data?.overviewActivities ?? [];
  const kybStatusLabel = overviewCards.kybStatus.replaceAll("_", " ");

  const activityColumns = React.useMemo<MvpTableColumn<OverviewActivity>[]>(
    () => [
      { id: "type", header: tt("Type"), cell: (row) => row.type.toUpperCase() },
      { id: "requestId", header: tt("Reference"), cell: (row) => row.requestId },
      { id: "amount", header: tt("Amount"), className: "text-right", cell: (row) => typeof row.amount === "number" ? formatCurrency(row.amount) : "-" },
      { id: "status", header: tt("Status"), cell: (row) => <StatusBadge status={row.status} /> },
      { id: "date", header: tt("Updated"), cell: (row) => formatDateTime(row.date) },
    ],
    [tt],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Overview")}
        description={tt("Account readiness, request snapshots, and reserve visibility in one operational dashboard.")}
        actions={
          <>
            <Button asChild>
              <Link href="/dashboard/mint">{tt("Start Mint")}</Link>
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MvpKpiCard
          label={tt("Current holdings")}
          value={formatCurrency(overviewCards.holdings)}
          hint={tt("Available token balance")}
          status="active"
          flipOnHover
          backContent={<HoldingsTodayMockChart />}
        />
        <MvpKpiCard
          label={tt("Reserve coverage")}
          value={formatPercent(overviewCards.reserveCoverage)}
          hint={tt("Latest published reserve ratio")}
          status="warning"
        />
        <MvpKpiCard
          label={tt("KYB status")}
          value={kybStatusLabel}
          hint={tt("You can submit requests")}
          status={overviewCards.kybStatus}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <MvpSectionCard
          title={tt("Latest activity")}
          description={tt("Recent mint, redeem, and KYB updates.")}
        >
          <MvpSimpleTable
            columns={activityColumns}
            data={overviewActivities}
            getRowId={(row) => row.id}
            emptyTitle={tt("No activity yet")}
            emptyDescription={tt("New requests and updates will appear here.")}
          />
        </MvpSectionCard>

        <div className="flex flex-col gap-4">
          <MvpSectionCard
            title={tt("Quick actions")}
            description={tt("Start key user operations.")}
            contentClassName="space-y-3"
          >
            <div className="flex flex-col gap-2">
              <Button asChild className="justify-between">
                <Link href="/dashboard/mint">
                  {tt("Create mint request")}
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link href="/dashboard/redeem">
                  {tt("Create redeem request")}
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </MvpSectionCard>
        </div>
      </div>
    </div>
  );
}
