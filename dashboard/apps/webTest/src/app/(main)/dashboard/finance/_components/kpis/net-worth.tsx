"use client";

import { SaudiRiyal } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useFinanceMetrics } from "../use-finance-metrics";

export function NetWorth() {
  const { tx, language } = useI18n();
  const locale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const { totalWalletBalance, monthOverMonthNetDelta } = useFinanceMetrics(locale);

  const deltaLabel = `${monthOverMonthNetDelta >= 0 ? "+" : "-"}${formatCurrency(Math.abs(monthOverMonthNetDelta), {
    noDecimals: true,
  })}`;

  return (
    <Card id="finance-net-worth">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-content-center rounded-sm bg-muted">
              <SaudiRiyal className="size-5" />
            </span>
            {tx("Net Worth", "Net Değer")}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <p className="font-medium text-xl tabular-nums">
              {formatCurrency(totalWalletBalance, { noDecimals: true })}
            </p>
            <span className="text-xs tabular-nums">
              {deltaLabel} {tx("MoM", "Aydan Aya")}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">
            {tx("This month", "Bu ay")}
          </p>
        </div>

        <Separator />

        <p className="text-muted-foreground text-xs">
          {tx("Across all linked wallet addresses", "Tüm bağlı cüzdan adresleri genelinde")}
        </p>
      </CardContent>
    </Card>
  );
}
