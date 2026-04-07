"use client";

import { useMemo } from "react";
import { Bar, CartesianGrid, ComposedChart, Dot, LabelList, Line, ReferenceLine, XAxis, YAxis } from "recharts";

import { useI18n } from "@/components/providers/language-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";
import { useAnalyticsMetrics } from "./use-analytics-metrics";

export function DriversForecastTarget() {
  const { tx, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 83);
  const analytics = useAnalyticsMetrics(locale, { from, to: now });

  const chartData = analytics.weeklySeries.map((point) => ({
    period: point.period,
    closedWon: point.settledVolume,
    weightedPipeline: point.submittedVolume,
    target: point.targetVolume,
    deltaLabel: point.deltaLabel,
  }));

  const forecastChartConfig = useMemo(
    () =>
      ({
        closedWon: {
          label: tx("Settled Volume", "Sonuçlanan Hacim"),
          color: "var(--chart-1)",
        },
        weightedPipeline: {
          label: tx("Submitted Volume", "Gönderilen Hacim"),
          color: "var(--chart-2)",
        },
        target: {
          label: tx("Weekly Target", "Haftalık Hedef"),
          color: "var(--muted-foreground)",
        },
      }) satisfies ChartConfig,
    [tx],
  );
  const pipelineMin = Math.min(0, ...chartData.map((point) => point.weightedPipeline));
  const pipelineMax = Math.max(1, ...chartData.map((point) => point.weightedPipeline));
  const latestWeek = analytics.latestWeek;
  const attainment =
    latestWeek && latestWeek.targetVolume > 0
      ? (latestWeek.settledVolume / latestWeek.targetVolume) * 100
      : 0;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>{tx("Forecast vs Target", "Tahmin ve Hedef")}</CardTitle>
        <CardDescription>{tx("12-week request flow with settlement context", "Sonuçlanma bağlamıyla 12 haftalık talep akışı")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricChip
            label={tx("Attainment", "Gerçekleşme")}
            value={`${attainment.toFixed(1)}%`}
            note={tx("settled / weekly target", "sonuçlanan / haftalık hedef")}
          />
          <MetricChip
            label={tx("Submitted Volume", "Gönderilen Hacim")}
            value={formatCurrency(latestWeek?.submittedVolume ?? 0, {
              noDecimals: true,
            })}
            note={tx("latest weekly window", "son haftalık pencere")}
          />
          <MetricChip
            label={tx("Open Queue", "Açık Kuyruk")}
            value={`${latestWeek?.openCount ?? 0}`}
            note={tx("currently open requests", "şu anda açık talepler")}
          />
        </div>
        <ChartContainer config={forecastChartConfig} className="h-68 w-full">
          <ComposedChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.25} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis
              tickFormatter={(value) =>
                formatCurrency(Number(value), { noDecimals: true })
              }
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={44}
              domain={[0, "auto"]}
            />
            <YAxis yAxisId="pipeline" hide domain={[pipelineMin, pipelineMax]} />
            <ChartTooltip
              cursor={false}
              content={(props) => (
                <ChartTooltipContent
                  active={props.active}
                  label={props.label}
                  className="w-48"
                  payload={(props.payload ?? []).map((item) => ({
                    ...item,
                    value:
                      typeof item.value === "number"
                        ? formatCurrency(item.value, { noDecimals: true })
                        : item.value,
                  }))}
                />
              )}
            />
            <ReferenceLine
              y={latestWeek?.targetVolume ?? 0}
              stroke="var(--color-target)"
              strokeWidth={2}
              strokeDasharray="6 5"
            />
            <Bar
              dataKey="closedWon"
              name={tx("Settled volume", "Sonuçlanan hacim")}
              fill="var(--color-closedWon)"
              fillOpacity={0.22}
              stroke="var(--color-closedWon)"
              strokeOpacity={0.35}
              radius={[5, 5, 0, 0]}
              barSize={14}
            >
              <LabelList dataKey="deltaLabel" position="top" offset={8} fill="var(--color-closedWon)" />
            </Bar>
            <Line
              type="monotone"
              yAxisId="pipeline"
              dataKey="weightedPipeline"
              name={tx("Submitted volume", "Gönderilen hacim")}
              strokeOpacity={0}
              strokeWidth={0}
              stroke="var(--color-weightedPipeline)"
              isAnimationActive={false}
              dot={({ payload, ...props }) => (
                <Dot
                  key={`${payload.period}-weighted-pipeline`}
                  cx={props.cx}
                  cy={props.cy}
                  r={3.5}
                  fill="var(--color-weightedPipeline)"
                  stroke="var(--color-weightedPipeline)"
                  strokeWidth={7}
                  strokeOpacity={0.08}
                />
              )}
              activeDot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function MetricChip({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-md border bg-muted/35 px-3 py-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold text-lg tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{note}</p>
    </div>
  );
}
