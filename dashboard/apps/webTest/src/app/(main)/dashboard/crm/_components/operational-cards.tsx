"use client";

import { Clock } from "lucide-react";
import { Funnel, FunnelChart, LabelList } from "recharts";

import { useI18n } from "@/components/providers/language-provider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { useCrmMetrics } from "./use-crm-metrics";

export function OperationalCards() {
  const { tx, tt, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const { stageRows, countryRows, actionItems } = useCrmMetrics(locale);

  const salesPipelineChartData = stageRows.map((row, index) => ({
    stage:
      row.stage === "under_review"
        ? tx("Under Review", "İncelemede")
        : row.stage === "processing"
          ? tx("Processing", "İşleniyor")
          : row.stage === "submitted"
            ? tx("Submitted", "Gönderildi")
            : row.stage === "approved"
              ? tx("Approved", "Onaylandı")
              : tx("Completed", "Tamamlandı"),
    value: row.value,
    fill: `var(--chart-${Math.min(5, index + 1)})`,
  }));

  const salesPipelineChartConfig = {
    value: {
      label: tx("Requests", "Talepler"),
      color: "var(--chart-1)",
    },
    stage: {
      label: tx("Stage", "Aşama"),
    },
  };

  const totalSales = countryRows.reduce((sum, region) => sum + region.count, 0);

  const translatePriority = (priority: string) => {
    if (priority === "high") return tx("High", "Yüksek");
    if (priority === "medium") return tx("Medium", "Orta");
    if (priority === "low") return tx("Low", "Düşük");
    return priority;
  };

  return (
    <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs sm:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{tx("Request Pipeline", "Talep Hattı")}</CardTitle>
        </CardHeader>
        <CardContent className="size-full">
          <ChartContainer config={salesPipelineChartConfig} className="size-full">
            <FunnelChart margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
              <Funnel className="stroke-2 stroke-card" dataKey="value" data={salesPipelineChartData}>
                <LabelList className="fill-foreground stroke-0" dataKey="stage" position="right" offset={10} />
                <LabelList className="fill-foreground stroke-0" dataKey="value" position="left" offset={10} />
              </Funnel>
            </FunnelChart>
          </ChartContainer>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">
            {tx("Pipeline distribution reflects live request statuses.", "Hat dağılımı canlı talep durumlarını yansıtır.")}
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tx("Accounts by Country", "Ülkeye Göre Hesaplar")}</CardTitle>
          <CardDescription className="font-medium tabular-nums">
            {totalSales}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2.5">
            {countryRows.map((region) => (
              <div key={region.country} className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{region.country}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-semibold text-sm tabular-nums">
                      {region.count}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={region.percentage} />
                  <span className="font-medium text-muted-foreground text-xs tabular-nums">
                    {region.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex justify-between gap-1 text-muted-foreground text-xs">
            <span>{tx(`${countryRows.length} countries tracked`, `${countryRows.length} ülke takip ediliyor`)}</span>
            <span>•</span>
            <span>
              {tx(
                `${countryRows.filter((r) => r.count > 0).length} active countries`,
                `${countryRows.filter((r) => r.count > 0).length} aktif ülke`,
              )}
            </span>
          </div>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tx("Action Queue", "Aksiyon Kuyruğu")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {actionItems.map((item) => (
              <li key={item.id} className="space-y-2 rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <Checkbox />
                  <span className="font-medium text-sm">{tt(item.title)}</span>
                  <span
                    className={cn(
                      "w-fit rounded-md px-2 py-1 font-medium text-xs",
                      item.priority === "high" && "bg-destructive/20 text-destructive",
                      item.priority === "medium" && "bg-yellow-500/20 text-yellow-500",
                      item.priority === "low" && "bg-green-500/20 text-green-500",
                    )}
                  >
                    {translatePriority(item.priority)}
                  </span>
                </div>
                <div className="font-medium text-muted-foreground text-xs">{tt(item.description)}</div>
                <div className="flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground text-xs">{item.due}</span>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
