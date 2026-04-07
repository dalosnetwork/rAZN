"use client";

import { CartesianGrid, Legend, Line, LineChart, XAxis, YAxis } from "recharts";

import { useI18n } from "@/components/providers/language-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { formatDate } from "./formatters";

type SeriesConfig<T extends string> = {
  key: T;
  label: string;
  color: string;
};

type TrendChartCardProps<T extends string, TRow extends { date: string }> = {
  title: string;
  description?: string;
  data: TRow[];
  series: SeriesConfig<T>[];
  yAxisFormat?: "plain" | "million" | "fixed1";
};

function formatYAxisTick(
  value: number,
  format: "plain" | "million" | "fixed1",
) {
  if (format === "million") {
    return `${Math.round(value / 1_000_000)}M`;
  }
  if (format === "fixed1") {
    return value.toFixed(1);
  }
  return String(value);
}

export function TrendChartCard<
  T extends string,
  TRow extends { date: string },
>({
  title,
  description,
  data,
  series,
  yAxisFormat = "plain",
}: TrendChartCardProps<T, TRow>) {
  const { tt } = useI18n();

  const config = series.reduce((acc, item) => {
    acc[item.key] = {
      label: tt(item.label),
      color: item.color,
    };
    return acc;
  }, {} as ChartConfig);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tt(title)}</CardTitle>
        {description ? (
          <CardDescription>{tt(description)}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={config} className="h-72 w-full">
          <LineChart data={data} margin={{ left: 6, right: 6 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => formatDate(value).split(",")[0]}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={68}
              tickFormatter={(value: number) =>
                formatYAxisTick(value, yAxisFormat)
              }
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                stroke={`var(--color-${item.key})`}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
