"use client";

import { BadgeDollarSign, Wallet } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, Line, LineChart, XAxis } from "recharts";
import { useMemo } from "react";

import { useI18n } from "@/components/providers/language-provider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

import { useCrmMetrics } from "./use-crm-metrics";

export function OverviewCards() {
  const { tx, language, tt } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const {
    weeklyFlow,
    monthlyFlow,
    requestsLast30Days,
    settledLast30Days,
    totalSettledVolume,
    successfulRequests,
    openRequests,
  } = useCrmMetrics(locale);

  const leadsChartData = useMemo(
    () =>
      weeklyFlow.map((point) => ({
        date: point.weekLabel,
        newLeads: point.submittedCount,
        disqualified: point.rejectedCount,
      })),
    [weeklyFlow],
  );
  const proposalsChartData = useMemo(
    () =>
      weeklyFlow.map((point) => ({
        date: point.weekLabel,
        proposalsSent: point.settledCount,
      })),
    [weeklyFlow],
  );
  const revenueChartData = useMemo(
    () =>
      monthlyFlow.map((point) => ({
        month: point.monthStart.toLocaleDateString(locale, {
          month: "short",
          year: "2-digit",
        }),
        revenue: point.income + point.expenses,
      })),
    [locale, monthlyFlow],
  );

  const recentWindowGrowth = useMemo(() => {
    const recent = monthlyFlow.slice(-3).reduce((sum, row) => sum + row.net, 0);
    const previous = monthlyFlow
      .slice(-6, -3)
      .reduce((sum, row) => sum + row.net, 0);

    if (previous === 0) {
      return 0;
    }

    return ((recent - previous) / Math.abs(previous)) * 100;
  }, [monthlyFlow]);

  const approvalRate =
    requestsLast30Days.length > 0
      ? (settledLast30Days.filter((row) => row.status === "approved" || row.status === "completed").length /
          requestsLast30Days.length) *
        100
      : 0;

  const leadsChartConfig = useMemo(
    () => ({
      newLeads: {
        label: tx("New Leads", "Yeni Potansiyeller"),
        color: "var(--chart-1)",
      },
      disqualified: {
        label: tx("Disqualified", "Elenen"),
        color: "var(--chart-3)",
      },
      background: {
        color: "var(--primary)",
      },
    }),
    [tx],
  );
  const proposalsChartConfig = useMemo(
    () => ({
      proposalsSent: {
        label: tx("Proposals Sent", "Gönderilen Teklifler"),
        color: "var(--chart-1)",
      },
    }),
    [tx],
  );
  const revenueChartConfig = useMemo(
    () => ({
      revenue: {
        label: tx("Revenue", "Gelir"),
        color: "var(--chart-1)",
      },
    }),
    [tx],
  );

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card>
        <CardHeader>
          <CardTitle>{tx("New Requests", "Yeni Talepler")}</CardTitle>
          <CardDescription>{tx("Last 30 days", "Son 30 gün")}</CardDescription>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer className="size-full min-h-24" config={leadsChartConfig}>
            <BarChart accessibilityLayer data={leadsChartData} barSize={8}>
              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                background={{ fill: "var(--color-background)", radius: 4, opacity: 0.07 }}
                dataKey="newLeads"
                stackId="a"
                fill="var(--color-newLeads)"
                radius={[0, 0, 0, 0]}
              />
              <Bar dataKey="disqualified" stackId="a" fill="var(--color-disqualified)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <span className="font-semibold text-xl tabular-nums">
            {requestsLast30Days.length}
          </span>
          <span className="font-medium text-sm">{approvalRate.toFixed(1)}%</span>
        </CardFooter>
      </Card>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle>{tx("Settled Requests", "Sonuçlanan Talepler")}</CardTitle>
          <CardDescription>{tx("Last 30 days", "Son 30 gün")}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ChartContainer className="size-full min-h-24" config={proposalsChartConfig}>
            <AreaChart
              data={proposalsChartData}
              margin={{
                left: 0,
                right: 0,
                top: 5,
              }}
            >
              <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} hide />
              <ChartTooltip
                content={<ChartTooltipContent hideIndicator />}
              />
              <Area
                dataKey="proposalsSent"
                fill="var(--color-proposalsSent)"
                fillOpacity={0.05}
                stroke="var(--color-proposalsSent)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex items-center justify-between py-3">
          <span className="font-semibold text-xl tabular-nums">
            {settledLast30Days.length}
          </span>
          <span className="text-muted-foreground text-xs">
            {tx("Closed in period", "Dönem içinde kapanan")}
          </span>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="w-fit rounded-lg bg-green-500/10 p-2">
            <Wallet className="size-5 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>{tx("Settled Volume", "Sonuçlanan Hacim")}</CardTitle>
            <CardDescription>{tx("Last 6 Months", "Son 6 Ay")}</CardDescription>
          </div>
          <p className="font-medium text-2xl tabular-nums">
            {formatCurrency(totalSettledVolume, { noDecimals: true })}
          </p>
          <div className="w-fit rounded-md bg-green-500/10 px-2 py-1 font-medium text-green-500 text-xs">
            {recentWindowGrowth >= 0 ? "+" : ""}
            {recentWindowGrowth.toFixed(1)}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="w-fit rounded-lg bg-destructive/10 p-2">
            <BadgeDollarSign className="size-5 text-destructive" />
          </div>
        </CardHeader>
        <CardContent className="flex size-full flex-col justify-between">
          <div className="space-y-1.5">
            <CardTitle>{tx("Successful Requests", "Başarılı Talepler")}</CardTitle>
            <CardDescription>{tx("Last 6 Months", "Son 6 Ay")}</CardDescription>
          </div>
          <p className="font-medium text-2xl tabular-nums">
            {successfulRequests.length}
          </p>
          <div className="w-fit rounded-md bg-destructive/10 px-2 py-1 font-medium text-destructive text-xs">
            {tx("Open queue", "Açık kuyruk")}: {openRequests.length}
          </div>
        </CardContent>
      </Card>

      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>{tx("Volume Trend", "Hacim Trendi")}</CardTitle>
          <CardDescription>{tx("Year to Date (YTD)", "Yılbaşından Bugüne (YTD)")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={revenueChartConfig} className="h-24 w-full">
            <LineChart
              data={revenueChartData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 0,
              }}
            >
              <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} hide />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                strokeWidth={2}
                dataKey="revenue"
                stroke="var(--color-revenue)"
                activeDot={{
                  r: 6,
                }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-sm">
            {tt("Values are derived from real mint/redeem request flow.")}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
