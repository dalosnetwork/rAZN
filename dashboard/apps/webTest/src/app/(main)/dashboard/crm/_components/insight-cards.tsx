"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Label, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { useCrmMetrics } from "./use-crm-metrics";

export function InsightCards() {
  const { tx, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const { railDistribution, stageRows } = useCrmMetrics(locale);

  const leadsBySourceChartData = railDistribution.map((entry) => ({
    source: entry.source,
    leads: entry.value,
    fill: `var(--color-${entry.source})`,
  }));
  const totalLeads = leadsBySourceChartData.reduce((acc, curr) => acc + curr.leads, 0);

  const statusLabels = {
    submitted: tx("Submitted", "Gönderildi"),
    under_review: tx("Under Review", "İncelemede"),
    processing: tx("Processing", "İşleniyor"),
    approved: tx("Approved", "Onaylandı"),
    completed: tx("Completed", "Tamamlandı"),
  } as const;

  const stageMax = Math.max(1, ...stageRows.map((row) => row.value));
  const projectRevenueChartData = stageRows
    .filter((row) => row.value > 0)
    .map((row) => ({
      name: statusLabels[row.stage as keyof typeof statusLabels] ?? row.stage,
      actual: row.value,
      remaining: Math.max(0, stageMax - row.value),
    }));

  const leadsBySourceChartConfig = useMemo(
    () =>
      ({
      leads: {
        label: tx("Leads", "Potansiyeller"),
      },
      bank: {
        label: tx("Bank", "Banka"),
        color: "var(--chart-1)",
      },
      swift: {
        label: "SWIFT",
        color: "var(--chart-2)",
      },
      crypto: {
        label: tx("Crypto", "Kripto"),
        color: "var(--chart-3)",
      },
      direct: {
        label: tx("Direct", "Doğrudan"),
        color: "var(--chart-5)",
      },
      }) satisfies ChartConfig,
    [tx],
  );
  const projectRevenueChartConfig = useMemo(
    () =>
      ({
      actual: {
        label: tx("Actual", "Gerçekleşen"),
        color: "var(--chart-1)",
      },
      remaining: {
        label: tx("Remaining", "Kalan"),
        color: "var(--chart-2)",
      },
      label: {
        color: "var(--primary-foreground)",
      },
      }) satisfies ChartConfig,
    [tx],
  );

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-5">
      <Card className="col-span-1 xl:col-span-2">
        <CardHeader>
          <CardTitle>{tx("Requests by Source", "Kaynağa Göre Talepler")}</CardTitle>
        </CardHeader>
        <CardContent className="max-h-48">
          <ChartContainer config={leadsBySourceChartConfig} className="size-full">
            <PieChart
              className="m-0"
              margin={{
                top: 0,
                right: 0,
                left: 0,
                bottom: 0,
              }}
            >
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={leadsBySourceChartData}
                dataKey="leads"
                nameKey="source"
                innerRadius={65}
                outerRadius={90}
                paddingAngle={2}
                cornerRadius={4}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground font-bold text-3xl tabular-nums"
                          >
                            {totalLeads.toLocaleString()}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 24} className="fill-muted-foreground">
                            {tx("Leads", "Potansiyeller")}
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
              <ChartLegend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                content={() => (
                  <ul className="ml-8 flex flex-col gap-3">
                    {leadsBySourceChartData.map((item) => (
                      <li key={item.source} className="flex w-36 items-center justify-between">
                        <span className="flex items-center gap-2 capitalize">
                          <span className="size-2.5 rounded-full" style={{ background: item.fill }} />
                          {
                            leadsBySourceChartConfig[item.source as keyof typeof leadsBySourceChartConfig]
                              ?.label
                          }
                        </span>
                        <span className="tabular-nums">{item.leads}</span>
                      </li>
                    ))}
                  </ul>
                )}
              />
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="gap-2">
          <Button size="sm" variant="outline" className="basis-1/2">
            {tx("View Full Report", "Tam Raporu Gör")}
          </Button>
          <Button size="sm" variant="outline" className="basis-1/2">
            {tx("Download CSV", "CSV İndir")}
          </Button>
        </CardFooter>
      </Card>

      <Card className="col-span-1 xl:col-span-3">
        <CardHeader>
          <CardTitle>{tx("Request Status Distribution", "Talep Durum Dağılımı")}</CardTitle>
        </CardHeader>
        <CardContent className="size-full max-h-52">
          <ChartContainer config={projectRevenueChartConfig} className="size-full">
            <BarChart accessibilityLayer data={projectRevenueChartData} layout="vertical">
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
                hide
              />
              <XAxis dataKey="actual" type="number" hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Bar stackId="a" dataKey="actual" layout="vertical" fill="var(--color-actual)">
                <LabelList
                  dataKey="name"
                  position="insideLeft"
                  offset={8}
                  className="fill-primary-foreground text-xs"
                />
                <LabelList
                  dataKey="actual"
                  position="insideRight"
                  offset={8}
                  className="fill-primary-foreground text-xs tabular-nums"
                />
              </Bar>
              <Bar
                stackId="a"
                dataKey="remaining"
                layout="vertical"
                fill="var(--color-remaining)"
                radius={[0, 6, 6, 0]}
              >
                <LabelList
                  dataKey="remaining"
                  position="insideRight"
                  offset={8}
                  className="fill-primary-foreground text-xs tabular-nums"
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">
            {tx("Live distribution built from real request statuses.", "Canlı dağılım gerçek talep durumlarından oluşturulur.")}
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
