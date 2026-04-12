"use client";

import * as React from "react";

import { BellRing, ShieldAlert, UserRoundPlus } from "lucide-react";

import { formatDateTime } from "@/app/(main)/dashboard/_mvp/components/formatters";
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

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardNotification } from "@/lib/api/dashboard";
import {
  useDashboardNotificationsQuery,
  useMarkDashboardNotificationsReadMutation,
} from "@/lib/queries/dashboard";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function categoryIcon(category: DashboardNotification["category"]) {
  if (category === "security") return ShieldAlert;
  if (category === "system") return UserRoundPlus;
  return BellRing;
}

export default function Page() {
  const { tt } = useI18n();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const notificationsQuery = useDashboardNotificationsQuery(page, pageSize, true, {
    refetchInterval: 5_000,
  });
  const markReadMutation = useMarkDashboardNotificationsReadMutation();
  const hasMarkedOnVisitRef = React.useRef(false);

  React.useEffect(() => {
    if (!notificationsQuery.data || hasMarkedOnVisitRef.current) {
      return;
    }
    hasMarkedOnVisitRef.current = true;
    if (notificationsQuery.data.pagination.unreadCount > 0) {
      markReadMutation.mutate({ markAll: true });
    }
  }, [markReadMutation, notificationsQuery.data]);

  const rows = notificationsQuery.data?.rows ?? [];
  const pagination = notificationsQuery.data?.pagination;
  const unreadCount = pagination?.unreadCount ?? 0;
  const securityCount = rows.filter(
    (item) => item.category === "security" || item.status === "warning",
  ).length;
  const approvalsCount = rows.filter((item) =>
    item.title.toLowerCase().includes("approved"),
  ).length;

  const columns = React.useMemo<MvpTableColumn<DashboardNotification>[]>(
    () => [
      {
        id: "title",
        header: tt("Notification"),
        cell: (row) => {
          const Icon = categoryIcon(row.category);
          return (
            <div className="flex items-start gap-2">
              <Icon className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{tt(row.title)}</p>
                <p className="text-muted-foreground text-xs">{tt(row.message)}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        header: tt("Status"),
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: "channel",
        header: tt("Channel"),
        cell: (row) => row.channel.toUpperCase(),
      },
      {
        id: "updatedAt",
        header: tt("Updated"),
        cell: (row) => formatDateTime(row.createdAt),
      },
    ],
    [tt],
  );

  const canGoPrev = (pagination?.page ?? 1) > 1;
  const canGoNext = (pagination?.page ?? 1) < (pagination?.totalPages ?? 1);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Notifications")}
        description={tt("Track all admin updates for your requests, KYB, wallet, and bank account changes.")}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MvpKpiCard
          label={tt("Unread notifications")}
          value={String(unreadCount)}
          hint={tt("Items awaiting acknowledgement")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Approval updates")}
          value={String(approvalsCount)}
          hint={tt("Recent approvals on this page")}
          status="approved"
        />
        <MvpKpiCard
          label={tt("Security-related")}
          value={String(securityCount)}
          hint={tt("Warnings and security events")}
          status={securityCount > 0 ? "warning" : "completed"}
        />
      </section>

      <MvpSectionCard
        title={tt("Inbox")}
        description={tt("Paginated notifications generated from admin and workflow events.")}
        contentClassName="space-y-4"
      >
        {notificationsQuery.isLoading ? (
          <MvpInlineLoading label={tt("Loading notifications")} />
        ) : null}
        {notificationsQuery.isError ? (
          <MvpErrorAlert
            title={tt("Notifications unavailable")}
            description={
              notificationsQuery.error instanceof Error
                ? notificationsQuery.error.message
                : tt("Could not load notifications from backend.")
            }
          />
        ) : null}

        <MvpSimpleTable
          columns={columns}
          data={rows}
          getRowId={(row) => row.id}
          enablePagination={false}
          emptyTitle={tt("No notifications")}
          emptyDescription={tt("New status changes and admin actions will appear here.")}
        />

        {pagination ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              {tt(
                `Showing ${rows.length === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}-${(pagination.page - 1) * pagination.pageSize + rows.length} of ${pagination.total}`,
              )}
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={`${pageSize}`}
                onValueChange={(value) => {
                  const parsed = Number(value);
                  if (!PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])) {
                    return;
                  }
                  setPageSize(parsed as (typeof PAGE_SIZE_OPTIONS)[number]);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[96px]">
                  <SelectValue placeholder={pageSize} />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={`${option}`}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                {tt(`Page ${pagination.page} of ${pagination.totalPages}`)}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoPrev}
                onClick={() => setPage((previous) => Math.max(1, previous - 1))}
              >
                {tt("Previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoNext}
                onClick={() =>
                  setPage((previous) =>
                    Math.min(pagination.totalPages, previous + 1),
                  )
                }
              >
                {tt("Next")}
              </Button>
            </div>
          </div>
        ) : null}
      </MvpSectionCard>
    </div>
  );
}
