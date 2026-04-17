"use client";

import { useI18n } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useAnalyticsMetrics } from "./use-analytics-metrics";

export function DriversCoverageTriage() {
  const { tx, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 83);
  const analytics = useAnalyticsMetrics(locale, { from, to: now });
  const coverage = analytics.coverage;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>{tx("Coverage Triage", "Kapsam Önceliklendirme")}</CardTitle>
        <CardDescription>{tx("Decision ladder for this forecast cycle", "Bu tahmin döngüsü için karar merdiveni")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={coverage.gapAmount > 0 ? "destructive" : "secondary"}
            className="rounded-md font-medium"
          >
            {coverage.gapAmount > 0 ? tx("At Risk", "Riskte") : tx("On Track", "Yolunda")}
          </Badge>
          <Badge variant="outline" className="font-medium tabular-nums">
            {coverage.openDeals} {tx("open requests", "açık talep")}
          </Badge>
          <Badge variant="outline" className="font-medium tabular-nums">
            {tx("Gap", "Açık")} {formatCurrency(coverage.gapAmount, { noDecimals: true })}
          </Badge>
        </div>

        <p className="text-muted-foreground text-xs">
          {tx(
            "Coverage and queue pressure are derived from real request flow.",
            "Kapsam ve kuyruk baskısı gerçek talep akışından türetilir.",
          )}
        </p>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {coverage.leverage.map((lever) => (
            <div key={lever.key} className="space-y-1 rounded-md border bg-muted/20 px-2.5 py-2">
              <p className="text-muted-foreground text-xs">{tx(lever.label, lever.label)}</p>
              <p className="font-semibold text-sm tabular-nums">{lever.value}</p>
              <p className="text-muted-foreground text-xs">{lever.context}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              {tx("Owner:", "Sorumlu:")} <span className="font-medium text-foreground">{coverage.owner}</span>
            </span>
            <span className="text-muted-foreground">
              {tx("Focus:", "Odak:")} <span className="text-foreground">{tx("largest open requests first", "önce en büyük açık talepler")}</span>
            </span>
            <span className="text-muted-foreground">
              {tx("Due:", "Teslim:")} <span className="text-foreground">{tx("before next review window", "bir sonraki inceleme penceresinden önce")}</span>
            </span>
          </div>
          <Button variant="secondary" size="sm" className="h-7 px-3 text-xs">
            {tx("Open top requests", "Öncelikli talepleri aç")}
          </Button>
        </div>

        <div className="space-y-1 rounded-md border border-dashed bg-muted/10 px-3 py-2.5">
          <p className="text-muted-foreground text-xs">
            {tx("Fastest path:", "En hızlı yol:")} <span className="font-medium text-foreground">{tx("resolve oldest queue items", "en eski kuyruk kalemlerini çöz")}</span>{" "}
            {tx("to reduce risk concentration.", "ve risk yoğunluğunu azalt.")}
          </p>
          <p className="text-muted-foreground text-xs">
            {tx("Priority sequence:", "Öncelik sırası:")} <span className="text-foreground">{tx("age and amount", "yaş ve tutar")}</span>{" "}
            {tx("before new submissions.", "yeni gönderimlerden önce gelir.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
