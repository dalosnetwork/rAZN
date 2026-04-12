"use client";

import * as React from "react";

import { CheckCircle2Icon } from "lucide-react";

import { MvpDetailDrawer } from "@/app/(main)/dashboard/_mvp/components/detail-drawer";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from "@/app/(main)/dashboard/_mvp/components/formatters";
import { MvpInlineLoading } from "@/app/(main)/dashboard/_mvp/components/state-blocks";
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

import type { RedeemRequest } from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateRedeemRequestMutation,
  useDashboardStateQuery,
} from "@/lib/queries/dashboard";
import { useMeQuery } from "@/lib/queries/auth";
import { hasAccessPermission, type UserAccess } from "@/lib/rbac/route-access";

type RedeemFormState = {
  amount: string;
  destination: string;
  payoutRail: string;
  note: string;
};

type SubmissionState = "idle" | "submitting" | "success" | "error";

const initialFormState: RedeemFormState = {
  amount: "",
  destination: "",
  payoutRail: "bank",
  note: "",
};

const statusFilters = [
  "all",
  "draft",
  "submitted",
  "queued",
  "processing",
  "approved",
  "rejected",
  "completed",
] as const;

function canCreateOwnRedeemRequest(access: UserAccess | null | undefined) {
  if (!access) {
    return false;
  }
  if (access.roleSlugs.includes("read_only")) {
    return false;
  }
  return hasAccessPermission(access, "dashboard.view");
}

function hasApprovedKybStatus(status: string | undefined) {
  return status === "approved";
}

function toColumns(
  onOpen: (request: RedeemRequest) => void,
  tt: (en: string) => string,
): MvpTableColumn<RedeemRequest>[] {
  return [
    {
      id: "request",
      header: tt("Request"),
      cell: (row) => row.requestId,
    },
    {
      id: "amount",
      header: tt("Amount"),
      className: "text-right",
      cell: (row) => formatCurrency(row.amount),
    },
    {
      id: "destination",
      header: tt("Destination"),
      cell: (row) => row.destination,
    },
    {
      id: "queue",
      header: tt("Queue"),
      className: "text-right",
      cell: (row) => (row.queuePos > 0 ? `#${row.queuePos}` : "-"),
    },
    {
      id: "status",
      header: tt("Status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "updated",
      header: tt("Updated"),
      cell: (row) => formatDateTime(row.updatedAt),
    },
    {
      id: "action",
      header: "",
      className: "text-right",
      cell: (row) => (
        <Button variant="outline" size="sm" onClick={() => onOpen(row)}>
          {tt("Details")}
        </Button>
      ),
    },
  ];
}

export default function Page() {
  const { tt } = useI18n();
  const meQuery = useMeQuery();
  const dashboardStateQuery = useDashboardStateQuery();
  const createRedeemRequestMutation = useCreateRedeemRequestMutation();
  const canCreateRedeemRequest = canCreateOwnRedeemRequest(
    meQuery.data?.access,
  );
  const kybStatus = dashboardStateQuery.data?.overviewCards.kybStatus;
  const hasApprovedKyb = hasApprovedKybStatus(kybStatus);
  const redeemableBalance = dashboardStateQuery.data?.overviewCards.holdings ?? 0;
  const hasPositiveBalance = redeemableBalance > 0;
  const [requests, setRequests] = React.useState<RedeemRequest[]>([]);
  const [form, setForm] = React.useState(initialFormState);
  const [errors, setErrors] = React.useState<
    Partial<Record<keyof RedeemFormState, string>>
  >({});
  const [submissionState, setSubmissionState] =
    React.useState<SubmissionState>("idle");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof statusFilters)[number]>("all");
  const [selectedRequest, setSelectedRequest] =
    React.useState<RedeemRequest | null>(null);

  React.useEffect(() => {
    if (dashboardStateQuery.data?.redeemRequests) {
      setRequests(dashboardStateQuery.data.redeemRequests);
    }
  }, [dashboardStateQuery.data?.redeemRequests]);

  const filteredRequests = React.useMemo(
    () =>
      requests.filter((request) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          query.length === 0 ||
          request.requestId.toLowerCase().includes(query) ||
          request.destination.toLowerCase().includes(query);
        const matchesStatus =
          statusFilter === "all" || request.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [requests, search, statusFilter],
  );

  const columns = React.useMemo(() => toColumns(setSelectedRequest, tt), [tt]);
  const approvedBankAccounts = React.useMemo(() => {
    const bankAccounts = dashboardStateQuery.data?.bankAccounts ?? [];
    return bankAccounts
      .filter((account) => account.status === "verified")
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }, [dashboardStateQuery.data?.bankAccounts]);
  const approvedDestinationLookup = React.useMemo(
    () =>
      new Set(
        approvedBankAccounts.map((account) =>
          account.ibanMasked.trim().toLowerCase(),
        ),
      ),
    [approvedBankAccounts],
  );
  const hasApprovedBankAccounts = approvedBankAccounts.length > 0;
  const canSubmitRedeemRequest =
    canCreateRedeemRequest &&
    hasApprovedKyb &&
    hasPositiveBalance &&
    hasApprovedBankAccounts;
  const pendingAmount = requests
    .filter((row) =>
      ["submitted", "queued", "processing", "approved"].includes(row.status),
    )
    .reduce((sum, row) => sum + row.amount, 0);

  React.useEffect(() => {
    if (!form.destination) {
      return;
    }
    const isCurrentDestinationApproved = approvedDestinationLookup.has(
      form.destination.trim().toLowerCase(),
    );
    if (!isCurrentDestinationApproved) {
      setForm((previous) => ({ ...previous, destination: "" }));
    }
  }, [approvedDestinationLookup, form.destination]);

  function setField<K extends keyof RedeemFormState>(
    field: K,
    value: RedeemFormState[K],
  ) {
    if (!canCreateRedeemRequest) {
      return;
    }
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateRedeemRequest) {
      return;
    }

    const nextErrors: Partial<Record<keyof RedeemFormState, string>> = {};
    const amount = Number(form.amount);

    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      nextErrors.amount = "Enter a valid amount.";
    }
    if (!hasApprovedKyb) {
      nextErrors.destination =
        "KYB must be approved before creating redemption requests.";
    }
    if (!hasPositiveBalance) {
      nextErrors.amount =
        "Redemption requires a positive wallet balance.";
    }
    if (!hasApprovedBankAccounts) {
      nextErrors.destination =
        "Add and verify a bank account before creating redemption requests.";
    } else if (!form.destination.trim()) {
      nextErrors.destination = "Payout destination is required.";
    } else if (
      !approvedDestinationLookup.has(form.destination.trim().toLowerCase())
    ) {
      nextErrors.destination = "Select one of your verified bank accounts.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSubmissionState("error");
      return;
    }

    setSubmissionState("submitting");

    try {
      await createRedeemRequestMutation.mutateAsync({
        amount,
        destination: form.destination.trim(),
        payoutRail: form.payoutRail as "bank" | "swift" | "crypto",
        note: form.note.trim() || undefined,
      });

      const refreshed = await dashboardStateQuery.refetch();
      const newestRequest = refreshed.data?.redeemRequests[0] ?? null;
      setSelectedRequest(newestRequest);
      setForm(initialFormState);
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Redeem")}
        description={tt("Create redemption requests, monitor queue state, and track payout progress.")}
      />
      {!canCreateRedeemRequest ? (
        <p className="text-muted-foreground text-sm">
          {tt("This action requires request creation access.")}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MvpKpiCard
          label={tt("Redeemable balance")}
          value={formatCurrency(redeemableBalance)}
          hint={tt("Available amount for new redemption")}
          status="active"
        />
        <MvpKpiCard
          label={tt("Pending redemption")}
          value={formatCurrency(pendingAmount)}
          hint={tt("In queue or processing")}
          status="pending"
        />
        <MvpKpiCard
          label={tt("Pending requests")}
          value={formatNumber(
            requests.filter((row) =>
              ["submitted", "queued", "processing", "approved"].includes(
                row.status,
              ),
            ).length,
          )}
          hint={tt("Open request")}
          status="pending"
        />
      </section>

      <div className="space-y-4">
        <MvpSectionCard
          title={tt("Create redemption request")}
          description={tt("Provide amount and select one of your verified destination accounts.")}
        >
          {!hasApprovedKyb ? (
            <p className="pb-3 text-destructive text-sm">
              {tt("KYB must be approved before submitting redemption requests.")}
            </p>
          ) : null}
          {!hasPositiveBalance ? (
            <p className="pb-3 text-destructive text-sm">
              {tt("Redemption is unavailable while your wallet balance is zero.")}
            </p>
          ) : null}
          {!hasApprovedBankAccounts ? (
            <p className="pb-3 text-destructive text-sm">
              {tt("Add and verify a bank account in Banking before submitting redemption requests.")}
            </p>
          ) : null}
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="redeem-amount">{tt("Amount (USD)")}</Label>
              <Input
                id="redeem-amount"
                inputMode="decimal"
                value={form.amount}
                disabled={!canCreateRedeemRequest}
                onChange={(event) => setField("amount", event.target.value)}
                placeholder="5000"
              />
              {errors.amount ? (
                <p className="text-destructive text-xs">{tt(errors.amount)}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="redeem-rail">{tt("Payout rail")}</Label>
              <Select
                value={form.payoutRail}
                disabled={!canCreateRedeemRequest}
                onValueChange={(value) => setField("payoutRail", value)}
              >
                <SelectTrigger id="redeem-rail">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">{tt("Bank transfer")}</SelectItem>
                  <SelectItem value="swift">{tt("SWIFT transfer")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="redeem-destination">
                {tt("Destination account")}
              </Label>
              <Select
                value={form.destination}
                disabled={!canCreateRedeemRequest || !hasApprovedBankAccounts}
                onValueChange={(value) => setField("destination", value)}
              >
                <SelectTrigger id="redeem-destination">
                  <SelectValue
                    placeholder={
                      hasApprovedBankAccounts
                        ? tt("Select verified destination account")
                        : tt("No verified bank account available")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {approvedBankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.ibanMasked}>
                      {account.isPrimary ? `${tt("Primary")} · ` : ""}
                      {account.bankName} - {account.ibanMasked} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.destination ? (
                <p className="text-destructive text-xs">
                  {tt(errors.destination)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="redeem-note">{tt("Notes")}</Label>
              <Textarea
                id="redeem-note"
                rows={4}
                value={form.note}
                disabled={!canCreateRedeemRequest}
                onChange={(event) => setField("note", event.target.value)}
                placeholder={tt("Optional context for redemption desk")}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <Button
                type="submit"
                disabled={
                  !canSubmitRedeemRequest || submissionState === "submitting"
                }
              >
                {submissionState === "submitting"
                  ? tt("Submitting...")
                  : tt("Submit redemption")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canCreateRedeemRequest}
                onClick={() => setForm(initialFormState)}
              >
                {tt("Reset")}
              </Button>
              {submissionState === "submitting" ? (
                <MvpInlineLoading label={tt("Submitting request")} />
              ) : null}
              {submissionState === "success" ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-sm">
                  <CheckCircle2Icon className="size-4" />
                  {tt("Redemption request submitted.")}
                </span>
              ) : null}
            </div>
          </form>
        </MvpSectionCard>

        <MvpSectionCard
          title={tt("Recent redemption requests")}
          description={tt("Track queue and payout progression for recent submissions.")}
          contentClassName="space-y-4"
        >
          <MvpTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={tt("Search request or destination")}
            filters={
              <Select
                value={statusFilter}
                onValueChange={(value: (typeof statusFilters)[number]) =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={tt("Status")} />
                </SelectTrigger>
                <SelectContent>
                  {statusFilters.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "all"
                        ? tt("All statuses")
                        : tt(status.replaceAll("_", " "))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          <MvpSimpleTable
            columns={columns}
            data={filteredRequests}
            getRowId={(row) => row.requestId}
            emptyTitle={tt("No redemption requests")}
            emptyDescription={tt("Try a different filter or submit a new redemption request.")}
          />
        </MvpSectionCard>
      </div>

      <MvpDetailDrawer
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRequest(null);
          }
        }}
        title={
          selectedRequest
            ? `${tt("Redemption")} ${selectedRequest.requestId}`
            : tt("Redemption")
        }
        description={
          selectedRequest
            ? `${tt("Last update")} ${formatDateTime(selectedRequest.updatedAt)}`
            : undefined
        }
      >
        {selectedRequest ? (
          <>
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{tt("Amount")}</p>
                <p className="font-medium">
                  {formatCurrency(selectedRequest.amount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  {tt("Destination")}
                </p>
                <p className="font-medium">{selectedRequest.destination}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{tt("Queue")}</p>
                <p className="font-medium">
                  {selectedRequest.queuePos > 0
                    ? `#${selectedRequest.queuePos}`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{tt("Status")}</p>
                <StatusBadge status={selectedRequest.status} />
              </div>
            </div>
            <StatusTimeline entries={selectedRequest.timeline} />
          </>
        ) : null}
      </MvpDetailDrawer>
    </div>
  );
}
