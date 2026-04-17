"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { useI18n } from "@/components/providers/language-provider";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useFinanceMetrics } from "./use-finance-metrics";

type CashFlowPeriod = "this-month" | "last-6-months" | "ytd" | "this-year";

export function CashFlowOverview() {
  const { tx, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const [period, setPeriod] = useState<CashFlowPeriod>("this-year");
  const { monthlyFlow } = useFinanceMetrics(locale);

  const filteredFlow = useMemo(() => {
    if (period === "this-month") {
      return monthlyFlow.slice(-1);
    }
    if (period === "last-6-months") {
      return monthlyFlow.slice(-6);
    }

    const now = new Date();
    const yearStartMonth = new Date(now.getFullYear(), 0, 1).getTime();
    const thisYear = monthlyFlow.filter(
      (point) => point.monthStart.getTime() >= yearStartMonth,
    );

    if (period === "ytd" || period === "this-year") {
      return thisYear;
    }

    return monthlyFlow;
  }, [monthlyFlow, period]);

  const chartData = useMemo(
    () =>
      filteredFlow.map((item) => ({
        ...item,
        expenses: -Math.abs(item.expenses),
        monthLabel: item.monthStart.toLocaleDateString(locale, {
          month: "short",
        }),
      })),
    [filteredFlow, locale],
  );
  const chartConfig = useMemo(
    () =>
      ({
        income: {
          label: tx("Income", "Gelir"),
          color: "var(--chart-1)",
        },
        expenses: {
          label: tx("Expenses", "Gider"),
          color: "var(--chart-2)",
        },
      }) as ChartConfig,
    [tx],
  );
  const totalIncome = chartData.reduce((acc, item) => acc + item.income, 0);
  const totalExpenses = chartData.reduce(
    (acc, item) => acc + Math.abs(item.expenses),
    0,
  );
  const maxAbs = Math.max(
    1000,
    ...chartData.map((item) => Math.max(item.income, Math.abs(item.expenses))),
  );
  const tickStep = Math.max(1000, Math.ceil(maxAbs / 4 / 500) * 500);
  const ticks = [-2 * tickStep, -tickStep, 0, tickStep, 2 * tickStep];

  return (
    <Card id="finance-cash-flow">
      <CardHeader>
        <CardTitle>{tx("Cash Flow Overview", "Nakit Akışı Özeti")}</CardTitle>
        <CardDescription>
          {tx(
            "Monthly income and expenses with net cash impact.",
            "Aylık gelir ve giderlerin net nakit etkisi.",
          )}
        </CardDescription>
        <CardAction>
          <Select
            value={period}
            onValueChange={(value) => setPeriod(value as CashFlowPeriod)}
          >
            <SelectTrigger className="w-37">
              <SelectValue placeholder={tx("Select period", "Dönem seçin")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">
                {tx("This Month", "Bu Ay")}
              </SelectItem>
              <SelectItem value="last-6-months">
                {tx("Last 6 Months", "Son 6 Ay")}
              </SelectItem>
              <SelectItem value="ytd">
                {tx("Year to Date", "Yılbaşından Bugüne")}
              </SelectItem>
              <SelectItem value="this-year">
                {tx("This Year", "Bu Yıl")}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Separator />
        <div className="flex items-start justify-between gap-2 py-5 md:items-stretch md:gap-0">
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-1">
              <ArrowDownLeft className="size-6 stroke-background" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                {tx("Income", "Gelir")}
              </p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totalIncome, { noDecimals: true })}
              </p>
            </div>
          </div>
          <Separator orientation="vertical" className="h-auto! self-stretch" />
          <div className="flex flex-1 items-center justify-center gap-2">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-chart-2">
              <ArrowUpRight className="size-6 stroke-background" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase">
                {tx("Expenses", "Giderler")}
              </p>
              <p className="font-medium tabular-nums">
                {formatCurrency(totalExpenses, { noDecimals: true })}
              </p>
            </div>
          </div>
        </div>
        <Separator />
        <ChartContainer className="max-h-72 w-full" config={chartConfig}>
          <BarChart
            stackOffset="sign"
            margin={{ left: -25, right: 0, top: 25, bottom: 0 }}
            accessibilityLayer
            data={chartData}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const abs = Math.abs(value);
                const formatted = abs >= 1000 ? `${abs / 1000}k` : `${abs}`;
                return value < 0 ? `-${formatted}` : formatted;
              }}
              ticks={ticks}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <ReferenceLine y={0} stroke="var(--border)" />
            <Bar
              dataKey="income"
              stackId="a"
              fill={chartConfig.income.color}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="expenses"
              stackId="a"
              fill={chartConfig.expenses.color}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
