"use client";

import Link from "next/link";
import { WalletMinimal } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useFinanceMetrics } from "../use-finance-metrics";

export function PrimaryAccount() {
  const { tx, language } = useI18n();
  const locale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const { totalWalletBalance, walletConnection } = useFinanceMetrics(locale);

  const connectionLabel =
    walletConnection && walletConnection.status === "connected"
      ? `${walletConnection.provider} • ${walletConnection.primaryNetwork}`
      : tx("No connected wallet", "Bağlı cüzdan yok");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-content-center rounded-sm bg-muted">
              <WalletMinimal className="size-5" />
            </span>
            {tx("Primary Account", "Birincil Hesap")}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-0.5">
          <p className="font-medium text-xl tabular-nums">
            {formatCurrency(totalWalletBalance, { noDecimals: true })}
          </p>

          <p className="text-muted-foreground text-xs">
            {tx("Connected wallet balance", "Bağlı cüzdan bakiyesi")}
          </p>
        </div>

        <p className="text-muted-foreground text-xs">{connectionLabel}</p>

        <div className="flex items-center gap-2">
          <Button className="flex-1" size="sm" asChild>
            <Link href="/dashboard/wallet">{tx("Wallet", "Cüzdan")}</Link>
          </Button>
          <Button className="flex-1" size="sm" variant="outline" asChild>
            <Link href="/dashboard/banking">{tx("Banking", "Bankacılık")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
