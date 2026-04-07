"use client";

import { useI18n } from "@/components/providers/language-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useFinanceMetrics } from "./use-finance-metrics";

export function SpendingBreakdown() {
  const { tx, language } = useI18n();
  const locale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const { spendingByRail } = useFinanceMetrics(locale);
  const total = spendingByRail.reduce((sum, item) => sum + item.amount, 0);

  const labelByKey = {
    bank: tx("Bank", "Banka"),
    swift: "SWIFT",
    crypto: tx("Crypto", "Kripto"),
  } as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx("Spending Breakdown", "Harcama Dağılımı")}</CardTitle>
        <CardDescription>{tx("Expense distribution by category.", "Kategorilere göre gider dağılımı.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="font-medium text-2xl">{formatCurrency(total, { noDecimals: true })}</div>
          <div className="flex h-6 w-full overflow-hidden rounded-md">
            {spendingByRail.map((item, index) => {
              const width = total > 0 ? (item.amount / total) * 100 : 0;
              const alpha = Math.max(0.35, 1 - index * 0.08);

              return (
                <div
                  key={item.key}
                  className="h-full shrink-0 border-background border-l first:border-l-0"
                  style={{
                    width: `${width}%`,
                    background: `color-mix(in oklch, var(--primary) ${alpha * 100}%, transparent)`,
                  }}
                  title={`${labelByKey[item.key]}: ${formatCurrency(item.amount)}`}
                />
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          {spendingByRail.map((item, index) => {
            const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
            const alpha = Math.max(0.35, 1 - index * 0.08);

            return (
              <div key={item.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-sm"
                    style={{
                      background: `color-mix(in oklch, var(--primary) ${alpha * 100}%, transparent)`,
                    }}
                  />
                  <span className="text-muted-foreground text-sm">
                    {labelByKey[item.key]}
                  </span>
                </div>

                <span className="font-medium text-sm tabular-nums">{pct}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
