"use client";

import { useMemo } from "react";

import { useI18n } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useAnalyticsMetrics } from "./use-analytics-metrics";

export function ActionsManagerQueue() {
  const { tx, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 83);
  const analytics = useAnalyticsMetrics(locale, { from, to: now });

  const nextInterventions = useMemo(
    () =>
      analytics.managerQueue.nextInterventions.map((item) => ({
        ...item,
        priorityLabel:
          item.priority === "Escalate"
            ? tx("Escalate", "Yükselt")
            : item.priority === "Coach"
              ? tx("Coach", "Koçluk")
              : tx("Reforecast", "Yeniden Tahmin"),
        recommendationLabel: tx(item.recommendation, item.recommendation),
      })),
    [analytics.managerQueue.nextInterventions, tx],
  );

  return (
    <Card className="h-full shadow-xs">
      <CardHeader>
        <CardTitle>{tx("Manager Action Queue", "Yönetici Aksiyon Sırası")}</CardTitle>
        <CardDescription>{tx("Escalate, coach, and reforecast before commit call", "Taahhüt görüşmesi öncesi yükselt, koçluk yap ve yeniden tahmin et")}</CardDescription>
      </CardHeader>

      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex h-full flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label={tx("Actionable deals", "Aksiyon alınabilir anlaşmalar")}
              value={`${analytics.managerQueue.actionableDeals}`}
            />
            <StatCard
              label={tx("Revenue in play", "Riskteki gelir")}
              value={formatCurrency(analytics.managerQueue.revenueInPlay, {
                noDecimals: true,
              })}
              mono
            />
            <StatCard
              label={tx("Owners engaged", "Dahil olan sorumlular")}
              value={`${analytics.managerQueue.ownersEngaged}`}
            />
            <StatCard
              label={tx("Median risk", "Ortanca risk")}
              value={`${analytics.managerQueue.medianRisk.toFixed(0)}`}
              mono
            />
          </div>

          <div className="space-y-2 rounded-md border bg-muted/20 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">{tx("Intervention mix", "Müdahale dağılımı")}</p>
              <Badge variant="outline" className="h-5 px-2 text-[11px] tabular-nums">
                {tx("Escalate", "Yükselt")}{" "}
                {analytics.managerQueue.interventionTotals.escalate.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between rounded-md border bg-background/70 px-2.5 py-1.5">
                <span className="text-xs">{tx("Escalate", "Yükselt")}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {analytics.managerQueue.interventionTotals.escalate.length}{" "}
                  {tx("deals", "anlaşma")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border bg-background/70 px-2.5 py-1.5">
                <span className="text-xs">{tx("Coach", "Koçluk")}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {analytics.managerQueue.interventionTotals.coach.length}{" "}
                  {tx("deals", "anlaşma")}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-md border bg-background/70 px-2.5 py-1.5">
                <span className="text-xs">{tx("Reforecast", "Yeniden Tahmin")}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {analytics.managerQueue.interventionTotals.reforecast.length}{" "}
                  {tx("deals", "anlaşma")}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-md border bg-muted/20 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-xs">{tx("Manager focus", "Yönetici odağı")}</p>
              <span className="text-muted-foreground text-xs tabular-nums">{tx("This forecast cycle", "Bu tahmin döngüsü")}</span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2 rounded-md border bg-background/70 px-2.5 py-1.5">
                <span>{tx("Coach queue", "Koçluk sırası")}</span>
                <span className="text-muted-foreground tabular-nums">
                  {analytics.managerQueue.interventionTotals.coach.length}{" "}
                  {tx("deals", "anlaşma")}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-md border bg-background/70 px-2.5 py-1.5">
                <span>{tx("Primary owner", "Birincil sorumlu")}</span>
                <span className="text-muted-foreground tabular-nums">
                  {nextInterventions[0]?.owner ?? tx("N/A", "Yok")}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-md border bg-background/70 px-2.5 py-1.5">
                <span>{tx("Stale pipeline", "Durağan hat")}</span>
                <span className="text-muted-foreground tabular-nums">
                  {analytics.summary.stalledCount} {tx("deals", "anlaşma")} ·{" "}
                  {formatCurrency(analytics.summary.revenueAtRisk, {
                    noDecimals: true,
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <p className="text-muted-foreground text-xs">{tx("Next interventions", "Sonraki müdahaleler")}</p>

            {nextInterventions.map((item) => (
              <div key={`${item.priority}-${item.dealId}`} className="space-y-1 rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{item.dealId}</span>
                  <Badge variant="outline" className="h-5 px-2 text-[11px]">
                    {item.priorityLabel}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-xs">
                  {item.owner} · {item.risk} {tx("risk", "risk")}
                </p>
                <p className="text-xs">{item.recommendationLabel}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
            <span className="text-muted-foreground text-xs">{tx("No-action monitor", "Aksiyon gerektirmeyen izleme")}</span>
            <span className="font-medium text-xs tabular-nums">
              {analytics.managerQueue.interventionTotals.monitor.length}{" "}
              {tx("Deals", "Anlaşma")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/20 px-2.5 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={mono ? "font-semibold text-base tabular-nums" : "font-semibold text-base"}>{value}</p>
    </div>
  );
}
