"use client";

import * as React from "react";

import { AlertTriangleIcon } from "lucide-react";

import { useI18n } from "@/components/providers/language-provider";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
} from "@/app/(main)/dashboard/_mvp/components/formatters";
import { MvpKpiCard } from "@/app/(main)/dashboard/_mvp/components/kpi-card";
import { MvpPageHeader } from "@/app/(main)/dashboard/_mvp/components/page-header";
import { MvpSectionCard } from "@/app/(main)/dashboard/_mvp/components/section-card";
import {
  MvpSimpleTable,
  type MvpTableColumn,
} from "@/app/(main)/dashboard/_mvp/components/simple-table";
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";
import { TrendChartCard } from "@/app/(main)/dashboard/_mvp/components/trend-chart-card";

import type { ReserveSnapshot } from "@/app/(main)/dashboard/_mvp/types";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  mockReserveAlerts,
  mockReserveTransparencySnapshots,
} from "@/lib/mocks/reserve";

export default function Page() {
  const { tt, tx } = useI18n();
  const snapshots = mockReserveTransparencySnapshots;
  const alerts = mockReserveAlerts;
  const latestSnapshot = snapshots[snapshots.length - 1] ?? {
    timestamp: new Date(0).toISOString(),
    reserves: 0,
    supply: 0,
    coverageRatio: 0,
    syncStatus: "inactive",
  };

  const reserveColumns = React.useMemo<MvpTableColumn<ReserveSnapshot>[]>(
    () => [
      { id: "date", header: tt("Snapshot"), cell: (row) => formatDate(row.timestamp) },
      { id: "reserves", header: tt("Reserves"), className: "text-right", cell: (row) => formatCurrency(row.reserves) },
      { id: "supply", header: tt("Supply"), className: "text-right", cell: (row) => formatCurrency(row.supply) },
      { id: "ratio", header: tt("Coverage"), className: "text-right", cell: (row) => formatPercent(row.coverageRatio) },
      { id: "status", header: tt("Sync status"), cell: (row) => <StatusBadge status={row.syncStatus} /> },
    ],
    [tt],
  );

  const chartRows = snapshots.map((snapshot) => ({
    date: snapshot.timestamp,
    reserves: snapshot.reserves,
    supply: snapshot.supply,
    coverage: snapshot.coverageRatio,
  }));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Reserve Transparency")}
        description={tt("Reserve backing, supply coverage, and freshness signals in a single data panel.")}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MvpKpiCard
          label={tt("Total reserves")}
          value={formatCurrency(latestSnapshot.reserves)}
          hint={tt("Latest published reserve value")}
          status={latestSnapshot.syncStatus}
        />
        <MvpKpiCard
          label={tt("Outstanding supply")}
          value={formatCurrency(latestSnapshot.supply)}
          hint={tt("Current token liability")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Coverage ratio")}
          value={formatPercent(latestSnapshot.coverageRatio)}
          hint={tt("Reserve to supply coverage")}
          status={latestSnapshot.coverageRatio < 101.5 ? "warning" : "approved"}
        />
        <MvpKpiCard
          label={tt("Last sync")}
          value={formatDateTime(latestSnapshot.timestamp)}
          hint={tt("Data freshness monitor")}
          status={latestSnapshot.syncStatus}
        />
      </section>

      {alerts.map((alert) => (
        <Alert key={alert.id}>
          <AlertTriangleIcon className="size-4" />
          <AlertTitle>{tt(alert.message)}</AlertTitle>
          <AlertDescription>
            {tx("Source", "Kaynak", "Источник", "Mənbə")}: {tt(alert.source)} •{" "}
            {tx("Owner", "Sorumlu", "Владелец", "Sahib")}: {alert.owner} •{" "}
            {tx("Created", "Oluşturuldu", "Создано", "Yaradıldı")}{" "}
            {formatDateTime(alert.createdAt)}
          </AlertDescription>
        </Alert>
      ))}

      <TrendChartCard
        title={tt("Reserves vs supply")}
        description={tt("Daily reserve and supply trend")}
        data={chartRows}
        series={[
          { key: "reserves", label: tt("Reserves"), color: "var(--chart-1)" },
          { key: "supply", label: tt("Supply"), color: "var(--chart-2)" },
        ]}
        yAxisFormat="million"
      />

      <MvpSectionCard
        title={tt("Published reserve snapshots")}
        description={tt("Recent reserve data points and sync state.")}
      >
        <MvpSimpleTable
          columns={reserveColumns}
          data={snapshots.slice().reverse()}
          getRowId={(row) => row.timestamp}
          emptyTitle={tt("No reserve snapshots")}
          emptyDescription={tt("Snapshots will appear after the next sync.")}
        />
      </MvpSectionCard>
    </div>
  );
}
