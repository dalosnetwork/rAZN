"use client";

import * as React from "react";

import Link from "next/link";

import { ArrowRightIcon } from "lucide-react";
import { Area, AreaChart, Cell, Label, Pie, PieChart, XAxis } from "recharts";

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

const WALLET_BREAKDOWN_MOCK = [
  { name: "primary", value: 45.2, fill: "var(--color-primary)" },
  { name: "trading", value: 28.7, fill: "var(--color-trading)" },
  { name: "reserve", value: 18.4, fill: "var(--color-reserve)" },
  { name: "other", value: 7.7, fill: "var(--color-other)" },
];

function HoldingsHoverContent() {
  const { tt } = useI18n();

  const areaChartConfig = React.useMemo<ChartConfig>(
    () => ({
      holdings: {
        label: tt("Holdings"),
        color: "var(--primary)",
      },
    }),
    [tt],
  );

  const pieChartConfig = React.useMemo<ChartConfig>(
    () => ({
      primary: { label: tt("Primary"), color: "var(--chart-1)" },
      trading: { label: tt("Trading"), color: "var(--chart-2)" },
      reserve: { label: tt("Reserve"), color: "var(--chart-3)" },
      other: { label: tt("Other"), color: "var(--chart-5)" },
    }),
    [tt],
  );

  const totalValue = WALLET_BREAKDOWN_MOCK.reduce((s, w) => s + w.value, 0);

  return (
    <div className="grid h-full w-full grid-cols-2 overflow-hidden">
      {/* Left — area chart */}
      <div className="h-full overflow-hidden border-r p-2">
        <p className="mb-1 px-1 text-muted-foreground text-[10px] font-medium">
          {tt("Trend")}
        </p>
        <ChartContainer
          config={areaChartConfig}
          className="h-[calc(100%-1rem)] w-full min-h-0 overflow-hidden p-0 aspect-auto"
        >
          <AreaChart
            accessibilityLayer
            data={HOLDINGS_TODAY_MOCK}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              minTickGap={32}
              interval="preserveStartEnd"
              className="text-[9px]"
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={false}
            />
            <Area
              type="monotone"
              dataKey="holdings"
              stroke="var(--color-holdings)"
              strokeWidth={2}
              fill="var(--color-holdings)"
              fillOpacity={0.12}
              dot={false}
              activeDot={{ r: 3, fill: "var(--color-holdings)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* Right — donut chart */}
      <div className="flex h-full flex-col overflow-hidden p-2">
        <p className="mb-1 px-1 text-muted-foreground text-[10px] font-medium">
          {tt("Wallets")}
        </p>
        <div className="flex flex-1 items-center justify-center min-h-0">
          <ChartContainer
            config={pieChartConfig}
            className="size-full min-h-0 overflow-hidden p-0 aspect-square max-h-[100px]"
          >
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={WALLET_BREAKDOWN_MOCK}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="90%"
                paddingAngle={2}
                cornerRadius={3}
                strokeWidth={0}
              >
                {WALLET_BREAKDOWN_MOCK.map((w) => (
                  <Cell key={w.name} fill={w.fill} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground font-semibold text-xs tabular-nums"
                          >
                            {totalValue.toFixed(0)}%
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
        <ul className="mt-auto flex flex-col gap-0.5 px-1">
          {WALLET_BREAKDOWN_MOCK.map((w) => (
            <li key={w.name} className="flex items-center justify-between text-[9px]">
              <span className="flex items-center gap-1">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: w.fill }}
                />
                <span className="text-muted-foreground">{tt(w.name)}</span>
              </span>
              <span className="tabular-nums font-medium">{w.value}%</span>
            </li>
          ))}
        </ul>
      </div>
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
  const walletAddresses = dashboardStateQuery.data?.walletAddresses ?? [];
  const totalBalance = walletAddresses.reduce((sum, item) => sum + item.balance, 0);
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
          value={formatCurrency(totalBalance)}
          hint={tt("Available token balance")}
          status="active"
          flipOnHover
          backContent={<HoldingsHoverContent />}
        />
        <MvpKpiCard
          label={tt("Reserve coverage")}
          value={formatPercent(overviewCards.reserveCoverage)}
          hint={tt("Latest published reserve ratio")}
          status={overviewCards.reserveCoverage >= 100 ? "approved" : "warning"}
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
