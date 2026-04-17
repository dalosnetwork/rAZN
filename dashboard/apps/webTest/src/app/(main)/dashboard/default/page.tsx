"use client";

import * as React from "react";

import type { DashboardUser } from "@/lib/api/users";
import { useI18n } from "@/components/providers/language-provider";
import {
  MvpErrorAlert,
  MvpInlineLoading,
} from "@/app/(main)/dashboard/_mvp/components/state-blocks";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
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
import type { OverviewActivity } from "@/app/(main)/dashboard/_mvp/types";
import {
  useAdminOverviewQuery,
  useDashboardStateQuery,
} from "@/lib/queries/dashboard";
import { useDashboardUsersQuery } from "@/lib/queries/users";

const usersQueryParams = {
  page: 1,
  pageSize: 10,
  sortBy: "createdAt",
  sortDir: "desc",
} as const;

const activityColumns: MvpTableColumn<OverviewActivity>[] = [
  {
    id: "type",
    header: "Type",
    cell: (row) => row.type.toUpperCase(),
  },
  {
    id: "requestId",
    header: "Reference",
    cell: (row) => row.requestId,
  },
  {
    id: "amount",
    header: "Amount",
    className: "text-right",
    cell: (row) =>
      typeof row.amount === "number" ? formatCurrency(row.amount) : "-",
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => <StatusBadge status={row.status} />,
  },
  {
    id: "updated",
    header: "Updated",
    cell: (row) => formatDateTime(row.date),
  },
];

const userColumns: MvpTableColumn<DashboardUser>[] = [
  {
    id: "name",
    header: "Name",
    cell: (row) => row.name,
  },
  {
    id: "email",
    header: "Email",
    cell: (row) => row.email,
  },
  {
    id: "roles",
    header: "Roles",
    cell: (row) => row.roles.join(", "),
  },
  {
    id: "createdAt",
    header: "Created",
    cell: (row) => formatDateTime(row.createdAt),
  },
];

export default function Page() {
  const { tt } = useI18n();
  const dashboardStateQuery = useDashboardStateQuery();
  const adminOverviewQuery = useAdminOverviewQuery();
  const usersQuery = useDashboardUsersQuery(usersQueryParams);

  const isLoading =
    dashboardStateQuery.isLoading ||
    adminOverviewQuery.isLoading ||
    usersQuery.isLoading;

  const queryError =
    dashboardStateQuery.error || adminOverviewQuery.error || usersQuery.error;

  const overviewCards = dashboardStateQuery.data?.overviewCards;
  const adminKpis = adminOverviewQuery.data?.kpis;
  const recentActivity = dashboardStateQuery.data?.overviewActivities ?? [];
  const recentUsers = usersQuery.data?.rows ?? [];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Default Dashboard")}
        description={tt("Live storage-backed operational metrics, activity feed, and latest users.")}
      />

      {isLoading ? <MvpInlineLoading /> : null}
      {queryError ? (
        <MvpErrorAlert
          title={tt("Could not load dashboard data")}
          description={
            queryError instanceof Error
              ? queryError.message
              : tt("Unknown dashboard error")
          }
        />
      ) : null}

      {!isLoading && !queryError ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MvpKpiCard
              label={tt("Total circulating supply")}
              value={formatCurrency(adminKpis?.totalCirculatingSupply ?? 0)}
              hint={tt("From live admin overview state")}
              status="active"
            />
            <MvpKpiCard
              label={tt("Reserve coverage")}
              value={formatPercent(adminKpis?.reserveCoverage ?? 0)}
              hint={tt("Latest coverage ratio")}
              status="active"
            />
            <MvpKpiCard
              label={tt("Outstanding requests")}
              value={formatNumber(overviewCards?.pendingRequests ?? 0)}
              hint={tt("Open mint and redeem requests")}
              status="under_review"
            />
            <MvpKpiCard
              label={tt("Active users")}
              value={formatNumber(usersQuery.data?.pagination.total ?? 0)}
              hint={tt("Total users from storage")}
              status="queued"
            />
          </section>

          <MvpSectionCard
            title={tt("Recent activity")}
            description={tt("Most recent mint, redeem, and KYB events.")}
          >
            <MvpSimpleTable
              columns={activityColumns}
              data={recentActivity}
              getRowId={(row) => row.id}
              emptyTitle={tt("No activity yet")}
              emptyDescription={tt("Events will appear when users interact with the system.")}
            />
          </MvpSectionCard>

          <MvpSectionCard
            title={tt("Latest users")}
            description={tt("Most recently created users from the database.")}
          >
            <MvpSimpleTable
              columns={userColumns}
              data={recentUsers}
              getRowId={(row) => row.id}
              emptyTitle={tt("No users found")}
              emptyDescription={tt("User records will appear here after registration.")}
            />
          </MvpSectionCard>
        </>
      ) : null}
    </div>
  );
}
