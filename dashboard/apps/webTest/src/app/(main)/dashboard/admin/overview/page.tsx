"use client";

import Link from "next/link";

import { useI18n } from "@/components/providers/language-provider";
import {
  formatCurrency,
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
import {
  MvpErrorAlert,
  MvpInlineLoading,
} from "@/app/(main)/dashboard/_mvp/components/state-blocks";
import { StatusBadge } from "@/app/(main)/dashboard/_mvp/components/status-badge";
import type { MvpStatus } from "@/app/(main)/dashboard/_mvp/types";

import { Button } from "@/components/ui/button";
import { useAdminOverviewQuery } from "@/lib/queries/dashboard";

type AdminActivityRow = {
  id: string;
  actor: string;
  action: string;
  status: MvpStatus;
  timestamp: string;
};

type AdminTransactionRow = {
  id: string;
  reference: string;
  type: "Mint" | "Redeem";
  network: string;
  amount: number;
  updatedAt: string;
  status: MvpStatus;
};

export default function Page() {
  const { tt } = useI18n();
  const adminOverviewQuery = useAdminOverviewQuery();

  const activityColumns: MvpTableColumn<AdminActivityRow>[] = [
    {
      id: "actor",
      header: tt("Actor"),
      cell: (row) => row.actor,
    },
    {
      id: "action",
      header: tt("Action"),
      cell: (row) => tt(row.action),
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "timestamp",
      header: tt("Time"),
      cell: (row) => formatDateTime(row.timestamp),
    },
  ];

  const transactionOversightColumns: MvpTableColumn<AdminTransactionRow>[] = [
    {
      id: "reference",
      header: tt("Reference"),
      cell: (row) => row.reference,
    },
    {
      id: "type",
      header: tt("Type"),
      cell: (row) => row.type,
    },
    {
      id: "network",
      header: tt("Network"),
      cell: (row) => row.network,
    },
    {
      id: "amount",
      header: tt("Amount"),
      className: "text-right",
      cell: (row) => formatCurrency(row.amount),
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "updatedAt",
      header: tt("Updated"),
      cell: (row) => formatDateTime(row.updatedAt),
    },
  ];

  const kpis = adminOverviewQuery.data?.kpis;
  const recentActivity = adminOverviewQuery.data?.recentActivity ?? [];
  const transactionOversight = adminOverviewQuery.data?.transactionOversight ?? [];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Admin Overview")}
        description={tt("Supply, reserve, and outstanding operations summary.")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/admin/mint-ops">
                {tt("Open Mint Ops")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/admin/wallet">{tt("Open Wallet")}</Link>
            </Button>
          </>
        }
      />

      {adminOverviewQuery.isLoading ? <MvpInlineLoading /> : null}
      {adminOverviewQuery.error ? (
        <MvpErrorAlert
          title={tt("Could not load admin overview")}
          description={adminOverviewQuery.error.message}
        />
      ) : null}

      {!adminOverviewQuery.isLoading && !adminOverviewQuery.error ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MvpKpiCard
              label={tt("Total circulating supply")}
              value={formatCurrency(kpis?.totalCirculatingSupply ?? 0)}
              hint={tt("Current rAZN in circulation")}
              status="active"
            />
            <MvpKpiCard
              label={tt("Reserve coverage")}
              value={formatPercent(kpis?.reserveCoverage ?? 0)}
              hint={tt("Reserve to supply coverage ratio")}
              status="active"
            />
            <MvpKpiCard
              label={tt("Outstanding mint value")}
              value={formatCurrency(kpis?.outstandingMintValue ?? 0)}
              hint={tt("Open mint requests awaiting completion")}
              status="under_review"
            />
            <MvpKpiCard
              label={tt("Monthly supply growth rate")}
              value={formatPercent(kpis?.monthlySupplyGrowthRate ?? 0)}
              hint={tt("Monthly circulating supply growth")}
              status={(kpis?.monthlySupplyGrowthRate ?? 0) >= 0 ? "active" : "warning"}
            />
            <MvpKpiCard
              label={tt("Outstanding redemption value")}
              value={formatCurrency(kpis?.outstandingRedemptionValue ?? 0)}
              hint={tt("Pending redemption requests")}
              status="queued"
            />
          </section>

          <MvpSectionCard
            title={tt("Recent admin activity")}
            description={tt("Latest operator decisions and status transitions.")}
          >
            <MvpSimpleTable
              columns={activityColumns}
              data={recentActivity}
              getRowId={(row) => row.id}
              emptyTitle={tt("No activity")}
              emptyDescription={tt("Admin events will appear here.")}
            />
          </MvpSectionCard>

          <MvpSectionCard
            title={tt("rAZN transaction oversight")}
            description={tt("Recent end-user rAZN movement across networks.")}
          >
            <MvpSimpleTable
              columns={transactionOversightColumns}
              data={transactionOversight}
              getRowId={(row) => row.id}
              emptyTitle={tt("No transaction movement")}
              emptyDescription={tt("End-user movement will appear here.")}
            />
          </MvpSectionCard>
        </>
      ) : null}
    </div>
  );
}
