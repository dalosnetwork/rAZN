"use client";

import { HandCoins } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useFinanceMetrics } from "../use-finance-metrics";

export function SavingsRate() {
  const { tx, language } = useI18n();
  const locale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const { savingsRate, averageSavingsRate } = useFinanceMetrics(locale);
  const delta = savingsRate - averageSavingsRate;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-content-center rounded-sm bg-muted">
              <HandCoins className="size-5" />
            </span>
            {tx("Savings Rate", "Tasarruf Oranı")}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <p className="font-medium text-xl tabular-nums">
              {savingsRate.toFixed(1)}%
            </p>
            <span className="text-xs tabular-nums">
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
          </div>
          <p className="text-muted-foreground text-xs">{tx("This month · After expenses", "Bu ay · Giderlerden sonra")}</p>
        </div>

        <Separator />

        <p className="text-muted-foreground text-xs">
          {delta >= 0
            ? tx("Above your 6-month average", "6 aylık ortalamanızın üstünde")
            : tx("Below your 6-month average", "6 aylık ortalamanızın altında")}
        </p>
      </CardContent>
    </Card>
  );
}
