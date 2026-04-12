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
  MvpErrorAlert,
  MvpInlineLoading,
} from "@/app/(main)/dashboard/_mvp/components/state-blocks";
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
import { useReserveManagementQuery } from "@/lib/queries/dashboard";

const filterOptions = ["all", "active", "warning", "stale"] as const;

function formatCoverageRatio(value: number) {
  return formatPercent(value * 100);
}

function toHourBucket(timestamp: string) {
  const date = new Date(timestamp);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function aggregateSnapshotsByHour(snapshots: TreasurySnapshot[]) {
  const buckets = new Map<
    string,
    {
      reservesTotal: number;
      supplyTotal: number;
      count: number;
    }
  >();

  for (const snapshot of snapshots) {
    const hour = toHourBucket(snapshot.timestamp);
    const current = buckets.get(hour) ?? {
      reservesTotal: 0,
      supplyTotal: 0,
      count: 0,
    };

    current.reservesTotal += snapshot.reserves;
    current.supplyTotal += snapshot.liabilities;
    current.count += 1;
    buckets.set(hour, current);
  }

  return Array.from(buckets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, aggregate]) => ({
      date,
      reserves: aggregate.reservesTotal / aggregate.count,
      supply: aggregate.supplyTotal / aggregate.count,
    }));
}

function formatHourTick(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
  });
}

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
      cell: (row) => formatCoverageRatio(row.coverageRatio),
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

export function ReserveManagementView() {
  const { tt } = useI18n();
  const reserveQuery = useReserveManagementQuery();
  const snapshots = reserveQuery.data?.snapshots ?? [];
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof filterOptions)[number]>("all");
  const [selectedSnapshot, setSelectedSnapshot] =
    React.useState<TreasurySnapshot | null>(null);

  const latestSnapshot = snapshots[snapshots.length - 1] ?? null;
  const historySnapshots = React.useMemo(
    () => snapshots.slice().reverse().slice(0, 10),
    [snapshots],
  );

  const filteredSnapshots = React.useMemo(
    () =>
      historySnapshots.filter((snapshot) => {
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
    [historySnapshots, search, statusFilter],
  );

  const snapshotColumns = React.useMemo(
    () => buildSnapshotColumns(tt, setSelectedSnapshot),
    [tt],
  );

  const chartRows = React.useMemo(
    () => aggregateSnapshotsByHour(snapshots),
    [snapshots],
  );

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Reserve Management")}
        description={tt("Reserve management with coverage and snapshot controls.")}
      />

      {reserveQuery.isLoading ? <MvpInlineLoading /> : null}
      {reserveQuery.error ? (
        <MvpErrorAlert
          title={tt("Could not load reserve data")}
          description={reserveQuery.error.message}
        />
      ) : null}

      {!reserveQuery.isLoading && !reserveQuery.error ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              label={tt("Coverage ratio")}
              value={formatCoverageRatio(latestSnapshot?.coverageRatio ?? 0)}
              hint={tt("Reserves vs circulating supply coverage")}
              status={(latestSnapshot?.coverageRatio ?? 0) >= 1 ? "approved" : "warning"}
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
            description={tt("Hourly aggregated reserve and circulating supply trend.")}
            data={chartRows}
            series={[
              { key: "reserves", label: tt("Reserves"), color: "var(--chart-1)" },
              {
                key: "supply",
                label: tt("Token supply"),
                color: "var(--chart-2)",
              },
            ]}
            yAxisFormat="million"
            xAxisTickFormatter={formatHourTick}
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
                ? `${formatDateTime(selectedSnapshot.timestamp)} • ${formatCoverageRatio(selectedSnapshot.coverageRatio)}`
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

                {selectedSnapshot.allocations.length > 0 ? (
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
                ) : null}

                {selectedSnapshot.timeline.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-sm">{tt("Snapshot timeline")}</p>
                    <StatusTimeline entries={selectedSnapshot.timeline} />
                  </div>
                ) : null}
              </>
            ) : null}
          </MvpDetailDrawer>
        </>
      ) : null}
    </div>
  );
}
