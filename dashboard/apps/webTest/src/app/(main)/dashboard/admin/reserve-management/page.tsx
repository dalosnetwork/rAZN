"use client";

import * as React from "react";
import { MvpDetailDrawer } from "@/app/(main)/dashboard/_mvp/components/detail-drawer";
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
import { StatusTimeline } from "@/app/(main)/dashboard/_mvp/components/status-timeline";
import { MvpTableToolbar } from "@/app/(main)/dashboard/_mvp/components/table-toolbar";
import { TrendChartCard } from "@/app/(main)/dashboard/_mvp/components/trend-chart-card";

import type { TreasurySnapshot } from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mockAdminLiquidReserves,
  mockAdminReserveSnapshots,
} from "@/lib/mocks/reserve";

const filterOptions = ["all", "active", "warning", "stale"] as const;

function buildSnapshotColumns(
  tt: (en: string) => string,
  onOpen: (snapshot: TreasurySnapshot) => void,
): MvpTableColumn<TreasurySnapshot>[] {
  return [
    {
      id: "snapshotId",
      header: tt("Snapshot"),
      cell: (row) => row.snapshotId,
    },
    {
      id: "date",
      header: tt("Timestamp"),
      cell: (row) => formatDateTime(row.timestamp),
    },
    {
      id: "reserves",
      header: tt("Reserves"),
      className: "text-right",
      cell: (row) => formatCurrency(row.reserves),
    },
    {
      id: "liabilities",
      header: tt("Liabilities"),
      className: "text-right",
      cell: (row) => formatCurrency(row.liabilities),
    },
    {
      id: "coverage",
      header: tt("Coverage"),
      className: "text-right",
      cell: (row) => formatPercent(row.coverageRatio),
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={row.status} />
          <StatusBadge status={row.feedFreshness} />
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Button size="sm" variant="outline" onClick={() => onOpen(row)}>
          {tt("Details")}
        </Button>
      ),
    },
  ];
}

export default function Page() {
  const { tt } = useI18n();
  const snapshots = mockAdminReserveSnapshots;
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof filterOptions)[number]>("all");
  const [selectedSnapshot, setSelectedSnapshot] =
    React.useState<TreasurySnapshot | null>(null);

  const latestSnapshot = snapshots[snapshots.length - 1] ?? null;

  const filteredSnapshots = React.useMemo(
    () =>
      snapshots
        .slice()
        .reverse()
        .filter((snapshot) => {
          const query = search.trim().toLowerCase();
          const matchesSearch =
            query.length === 0 ||
            snapshot.snapshotId.toLowerCase().includes(query) ||
            formatDate(snapshot.timestamp).toLowerCase().includes(query);
          const matchesStatus =
            statusFilter === "all" ||
            snapshot.status === statusFilter ||
            snapshot.feedFreshness === statusFilter;
          return matchesSearch && matchesStatus;
        }),
    [search, snapshots, statusFilter],
  );

  const liquidReserves = mockAdminLiquidReserves;

  const snapshotColumns = React.useMemo(
    () => buildSnapshotColumns(tt, setSelectedSnapshot),
    [tt],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Reserve Management")}
        description={tt("Reserve management with coverage and snapshot controls.")}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MvpKpiCard
          label={tt("Total reserves value")}
          value={formatCurrency(latestSnapshot?.reserves ?? 0)}
          hint={tt("Latest treasury reserve mark")}
          status={latestSnapshot?.status ?? "inactive"}
        />
        <MvpKpiCard
          label={tt("Total circulating supply")}
          value={formatCurrency(latestSnapshot?.liabilities ?? 0)}
          hint={tt("Current rAZN circulating supply")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Liquid reserves (fiat)")}
          value={formatCurrency(liquidReserves)}
          hint={tt("Available fiat reserves")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Coverage ratio")}
          value={formatPercent(latestSnapshot?.coverageRatio ?? 0)}
          hint={tt("Reserves vs circulating supply coverage")}
          status={(latestSnapshot?.coverageRatio ?? 0) > 101 ? "approved" : "warning"}
        />
        <MvpKpiCard
          label={tt("Last sync timestamp")}
          value={
            latestSnapshot?.timestamp
              ? formatDateTime(latestSnapshot.timestamp)
              : "-"
          }
          hint={tt("Most recent reserve snapshot sync")}
          status={latestSnapshot?.feedFreshness ?? "inactive"}
        />
      </section>

      <TrendChartCard
        title={tt("Reserves vs token supply")}
        description={tt("Daily reserve and circulating supply trend.")}
        data={snapshots.map((snapshot) => ({
          date: snapshot.timestamp,
          reserves: snapshot.reserves,
          supply: snapshot.liabilities,
        }))}
        series={[
          { key: "reserves", label: tt("Reserves"), color: "var(--chart-1)" },
          {
            key: "supply",
            label: tt("Token supply"),
            color: "var(--chart-2)",
          },
        ]}
        yAxisFormat="million"
      />

      <MvpSectionCard
        title={tt("Snapshot history")}
        description={tt("Reconciliation-oriented snapshot table with reserve and freshness states.")}
        contentClassName="space-y-4"
      >
        <MvpTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tt("Search snapshot ID or date")}
          filters={
            <Select
              value={statusFilter}
              onValueChange={(value: (typeof filterOptions)[number]) =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={tt("All statuses")} />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? tt("All statuses") : tt(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <MvpSimpleTable
          columns={snapshotColumns}
          data={filteredSnapshots}
          getRowId={(row) => row.snapshotId}
          emptyTitle={tt("No snapshots found")}
          emptyDescription={tt("Try updating filters or trigger a new reconciliation run.")}
        />
      </MvpSectionCard>

      <MvpDetailDrawer
        open={Boolean(selectedSnapshot)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSnapshot(null);
          }
        }}
        title={
          selectedSnapshot
            ? `${tt("Treasury snapshot")} ${selectedSnapshot.snapshotId}`
            : tt("Treasury snapshot")
        }
        description={
          selectedSnapshot
            ? `${formatDateTime(selectedSnapshot.timestamp)} • ${formatPercent(selectedSnapshot.coverageRatio)}`
            : undefined
        }
      >
        {selectedSnapshot ? (
          <>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selectedSnapshot.status} />
                <StatusBadge status={selectedSnapshot.feedFreshness} />
              </div>
              <p className="mt-2 text-sm">
                {tt("Reserves")}: {formatCurrency(selectedSnapshot.reserves)}
              </p>
              <p className="text-sm">
                {tt("Liabilities")}:{" "}
                {formatCurrency(selectedSnapshot.liabilities)}
              </p>
              <p className="text-sm">
                {tt("Variance")}: {formatCurrency(selectedSnapshot.variance)}
              </p>
              {selectedSnapshot.notes ? (
                <p className="mt-1 text-muted-foreground text-xs">
                  {tt(selectedSnapshot.notes)}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="font-medium text-sm">
                {tt("Allocation breakdown")}
              </p>
              {selectedSnapshot.allocations.map((allocation) => (
                <div key={allocation.bucket} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{allocation.bucket}</span>
                    <span className="text-muted-foreground">
                      {allocation.share.toFixed(1)}% •{" "}
                      {formatCurrency(allocation.amount)}
                    </span>
                  </div>
                  <Progress value={allocation.share} />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="font-medium text-sm">{tt("Snapshot timeline")}</p>
              <StatusTimeline entries={selectedSnapshot.timeline} />
            </div>
          </>
        ) : null}
      </MvpDetailDrawer>
    </div>
  );
}
