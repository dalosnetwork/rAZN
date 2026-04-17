"use client";

import { Calendar, TrendingUp } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useFinanceMetrics } from "../use-finance-metrics";

export function MonthlyCashFlow() {
  const { tx, language } = useI18n();
  const locale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const { currentMonthNet, monthOverMonthPercent } = useFinanceMetrics(locale);

  const trendPrefix = currentMonthNet >= 0 ? "+" : "-";
  const trendPercent = `${monthOverMonthPercent >= 0 ? "+" : "-"}${Math.abs(monthOverMonthPercent).toFixed(1)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-content-center rounded-sm bg-muted">
              <Calendar className="size-5" />
            </span>
            {tx("Monthly Cash Flow", "Aylık Nakit Akışı")}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          <p className="font-medium text-xl tabular-nums">
            {trendPrefix}
            {formatCurrency(Math.abs(currentMonthNet), { noDecimals: true })}
          </p>
          <p className="text-muted-foreground text-xs">{tx("This month · Net", "Bu ay · Net")}</p>
        </div>

        <Separator />
        <p className="flex items-center text-muted-foreground text-xs">
          <TrendingUp className="size-4" />
          &nbsp;{trendPercent} {tx("MoM", "Aydan Aya")}
        </p>
      </CardContent>
    </Card>
  );
}
