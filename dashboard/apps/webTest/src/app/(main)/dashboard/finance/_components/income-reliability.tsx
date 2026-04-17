"use client";

import { useI18n } from "@/components/providers/language-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useFinanceMetrics } from "./use-finance-metrics";

export function IncomeReliability() {
  const { tx, language } = useI18n();
  const locale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const {
    incomeReliabilityLevel,
    incomeReliabilityScore,
    fixedIncomeEstimate,
    variableIncomeEstimate,
  } = useFinanceMetrics(locale);

  const reliabilityLabel =
    incomeReliabilityLevel === "high"
      ? tx("High Reliability", "Yüksek Güvenilirlik")
      : incomeReliabilityLevel === "medium"
        ? tx("Moderate Reliability", "Orta Güvenilirlik")
        : tx("Low Reliability", "Düşük Güvenilirlik");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx("Income Reliability", "Gelir Güvenilirliği")}</CardTitle>
        <CardDescription>{tx("How consistent your income has been recently.", "Gelirinizin son dönemde ne kadar tutarlı olduğu.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />
        <div className="space-y-0.5">
          <p className="font-medium text-xl">{reliabilityLabel}</p>
          <p className="text-muted-foreground text-xs">
            {tx("Score based on last 6 months", "Son 6 aya göre skor")} •{" "}
            {incomeReliabilityScore.toFixed(1)}%
          </p>
        </div>
        <Separator />
        <div className="flex justify-between">
          <div className="space-y-0.5">
            <p className="font-medium text-lg">{tx("Fixed Income", "Sabit Gelir")}</p>
            <p className="text-muted-foreground text-xs">{tx("Recurring · Predictable", "Düzenli · Öngörülebilir")}</p>
          </div>
          <p className="font-medium text-lg">
            {formatCurrency(fixedIncomeEstimate, { noDecimals: true })}
          </p>
        </div>
        <Separator />
        <div className="flex justify-between">
          <div className="space-y-0.5">
            <p className="font-medium text-lg">{tx("Variable Income", "Değişken Gelir")}</p>
            <p className="text-muted-foreground text-xs">{tx("Fluctuating sources", "Dalgalı kaynaklar")}</p>
          </div>
          <p className="font-medium text-lg">
            {formatCurrency(variableIncomeEstimate, { noDecimals: true })}
          </p>
        </div>
        <Separator />
        <p className="text-muted-foreground text-xs">
          {tx("Consistency trend:", "Tutarlılık eğilimi:")}{" "}
          <span className="font-medium text-primary">{reliabilityLabel}</span>
        </p>
      </CardContent>
    </Card>
  );
}
