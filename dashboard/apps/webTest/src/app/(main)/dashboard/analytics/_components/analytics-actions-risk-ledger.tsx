"use client";

import * as React from "react";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import { useI18n } from "@/components/providers/language-provider";
import {
  useAnalyticsMetrics,
  type RiskLedgerRow,
} from "./use-analytics-metrics";

const priorityTone: Record<Exclude<RiskLedgerRow["priority"], null>, string> = {
  Escalate: "border-destructive/35 bg-destructive/10 text-destructive",
  Coach: "border-primary/35 bg-primary/10 text-primary",
  Reforecast: "border-amber-500/35 bg-amber-500/10 text-amber-700",
};

type TxFn = (en: string, tr: string) => string;

function translateStage(stage: string, tx: TxFn) {
  if (stage === "under_review") return tx("Under review", "İncelemede");
  if (stage === "processing") return tx("Processing", "İşleniyor");
  if (stage === "submitted") return tx("Submitted", "Gönderildi");
  if (stage === "queued") return tx("Queued", "Sırada");
  return stage.replaceAll("_", " ");
}

function translatePriority(priority: Exclude<RiskLedgerRow["priority"], null>, tx: TxFn) {
  if (priority === "Escalate") return tx("Escalate", "Yükselt");
  if (priority === "Coach") return tx("Coach", "Koçluk");
  if (priority === "Reforecast") return tx("Reforecast", "Yeniden Tahmin");
  return priority;
}

function createLedgerColumns(tx: TxFn): ColumnDef<RiskLedgerRow>[] {
  return [
    {
      accessorKey: "account",
      header: tx("Destination", "Hedef"),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{row.original.account}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.dealId} · {translateStage(row.original.stage, tx)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "blocker",
      header: tx("Blocker", "Engel"),
      cell: ({ row }) => <div className="max-w-44 text-xs">{row.original.blocker}</div>,
    },
    {
      accessorKey: "owner",
      header: tx("Owner", "Sorumlu"),
      cell: ({ row }) => <span className="text-xs">{row.original.owner}</span>,
    },
    {
      accessorKey: "idleDays",
      header: tx("Idle (days)", "Boşta (gün)"),
      cell: ({ row }) => <span className="text-xs tabular-nums">{row.original.idleDays}d</span>,
    },
    {
      accessorKey: "amount",
      header: tx("Amount", "Tutar"),
      cell: ({ row }) => (
        <span className="text-xs tabular-nums">
          {formatCurrency(row.original.amount, { noDecimals: true })}
        </span>
      ),
    },
    {
      accessorKey: "nextAction",
      header: tx("Next action", "Sonraki aksiyon"),
      cell: ({ row }) => (
        <div className="flex max-w-64 flex-col gap-1">
          {row.original.priority ? (
            <Badge
              variant="outline"
              className={cn("text-[10px] uppercase", priorityTone[row.original.priority])}
            >
              {translatePriority(row.original.priority, tx)}
            </Badge>
          ) : null}
          <p className="text-xs">{row.original.nextAction}</p>
        </div>
      ),
    },
    {
      accessorKey: "riskScore",
      header: ({ column }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 h-8 px-2 text-xs"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            {tx("Risk Ladder", "Risk Basamağı")}
          </Button>
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Badge
            variant="outline"
            className={cn(
              "min-w-12 justify-center font-medium tabular-nums",
              row.original.riskScore >= 80 &&
                "border-destructive/35 bg-destructive/10 text-destructive",
              row.original.riskScore >= 65 &&
                row.original.riskScore < 80 &&
                "border-amber-500/35 bg-amber-500/10 text-amber-700",
            )}
          >
            {row.original.riskScore}
          </Badge>
        </div>
      ),
    },
  ];
}

export function ActionsRiskLedger() {
  const { tx, language } = useI18n();
  const locale =
    language === "tr" ? "tr-TR" : language === "ru" ? "ru-RU" : language === "az" ? "az-AZ" : "en-US";
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 83);
  const analytics = useAnalyticsMetrics(locale, { from, to: now });
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "riskScore", desc: true },
  ]);
  const columns = React.useMemo(() => createLedgerColumns(tx), [tx]);

  const table = useReactTable({
    data: analytics.riskLedgerRows,
    columns,
    getRowId: (row) => row.id,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const criticalCount = analytics.riskLedgerRows.filter(
    (row) => row.riskScore >= 80,
  ).length;
  const escalationsDue = analytics.riskLedgerRows.filter(
    (row) => row.priority === "Escalate",
  ).length;
  const medianIdle =
    analytics.riskLedgerRows.length > 0
      ? Math.round(
          analytics.riskLedgerRows.reduce((sum, row) => sum + row.idleDays, 0) /
            analytics.riskLedgerRows.length,
        )
      : 0;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle>{tx("Revenue Risk Ledger", "Gelir Risk Defteri")}</CardTitle>
        <CardDescription>
          {tx(
            "Requests under pressure with blocker, next action, and owner responsibility.",
            "Engel, sonraki aksiyon ve sorumluluk bilgileriyle baskı altındaki talepler.",
          )}
        </CardDescription>
        <CardAction>
          <Badge variant="outline" className="font-medium tabular-nums">
            {tx(
              `${analytics.riskLedgerRows.length} Requests`,
              `${analytics.riskLedgerRows.length} Talep`,
            )}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-4 sm:divide-x sm:divide-border/60">
          <LedgerStat
            label={tx("Critical requests", "Kritik talepler")}
            value={`${criticalCount}`}
            detail={tx(
              "Risk Ladder >= 80 (current window)",
              "Risk Basamağı >= 80 (mevcut pencere)",
            )}
          />
          <LedgerStat
            label={tx("Escalations due", "Bekleyen yükseltmeler")}
            value={`${escalationsDue}`}
            detail={tx("Current queue", "Mevcut kuyruk")}
          />
          <LedgerStat
            label={tx("Median inactivity", "Ortanca hareketsizlik")}
            value={`${medianIdle}d`}
            detail={tx("Current filter window", "Mevcut filtre penceresi")}
          />
          <LedgerStat
            label={tx("Overdue revenue", "Gecikmiş gelir")}
            value={formatCurrency(analytics.summary.revenueAtRisk, {
              noDecimals: true,
            })}
            detail={tx("Open requests older than 14 days", "14 günden eski açık talepler")}
          />
        </div>

        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function LedgerStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-0 sm:px-3 last:sm:pr-0 first:sm:pl-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-semibold text-base tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{detail}</p>
    </div>
  );
}
