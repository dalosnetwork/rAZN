"use client";

import Link from "next/link";

import { formatDateTime } from "@/app/(main)/dashboard/_mvp/components/formatters";
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";
import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { useFinanceMetrics } from "./use-finance-metrics";

export function CardOverview() {
  const { tx, language } = useI18n();
  const locale = language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : "en-US";
  const { primaryBankAccount, walletConnection, upcomingRequests } =
    useFinanceMetrics(locale);

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>{tx("Account Snapshot", "Hesap Özeti")}</CardTitle>
        <CardDescription>
          {tx(
            "Wallet and settlement readiness with open-request visibility.",
            "Açık taleplerle birlikte cüzdan ve mutabakat hazırlığı.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{tx("Primary bank", "Birincil banka")}</span>
              <span className="font-medium tabular-nums">
                {primaryBankAccount?.bankName ?? tx("Not linked", "Bağlı değil")}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{tx("Wallet provider", "Cüzdan sağlayıcı")}</span>
              <span className="font-medium tabular-nums">
                {walletConnection?.provider ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{tx("Primary network", "Birincil ağ")}</span>
              <span className="font-medium tabular-nums">
                {walletConnection?.primaryNetwork ?? "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{tx("Daily transfer used", "Günlük transfer kullanımı")}</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(walletConnection?.usedToday ?? 0, {
                  noDecimals: true,
                })}{" "}
                /{" "}
                {formatCurrency(walletConnection?.dailyTransferLimit ?? 0, {
                  noDecimals: true,
                })}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Button className="w-full" size="sm" asChild>
              <Link href="/dashboard/wallet">{tx("Manage Wallet", "Cüzdanı Yönet")}</Link>
            </Button>

            <Button className="w-full" variant="outline" size="sm" asChild>
              <Link href="/dashboard/banking">{tx("Manage Bank Accounts", "Banka Hesaplarını Yönet")}</Link>
            </Button>
          </div>
          <Separator />

          <div className="space-y-4">
            <h6 className="text-muted-foreground text-sm uppercase">
              {tx("Open Requests", "Açık Talepler")}
            </h6>

            <div className="space-y-4">
              {upcomingRequests.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {tx(
                    "No open requests. New mint/redeem operations will appear here.",
                    "Açık talep yok. Yeni mint/redeem işlemleri burada görünecek.",
                  )}
                </p>
              ) : (
                upcomingRequests.map((request) => (
                  <div key={request.id} className="rounded-md border px-3 py-2">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">
                        {request.type === "mint"
                          ? tx("Mint request", "Mint talebi")
                          : tx("Redeem request", "Redeem talebi")}{" "}
                        {request.id}
                      </p>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(request.submittedAt)}
                    </p>
                    <p className="mt-1 font-medium text-sm tabular-nums">
                      {formatCurrency(request.amount, { noDecimals: true })}
                    </p>
                  </div>
                ))
              )}
            </div>

            <Button className="w-full" size="sm" variant="outline" asChild>
              <Link href="/dashboard/overview">{tx("View All Activity", "Tüm Aktiviteyi Gör")}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
