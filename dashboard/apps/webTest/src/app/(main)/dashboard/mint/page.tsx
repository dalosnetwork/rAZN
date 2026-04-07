"use client";

import * as React from "react";

import { CheckCircle2Icon, CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { MvpDetailDrawer } from "@/app/(main)/dashboard/_mvp/components/detail-drawer";
import {
  MvpErrorAlert,
  MvpInlineLoading,
} from "@/app/(main)/dashboard/_mvp/components/state-blocks";
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
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

import type { MintRequest } from "@/app/(main)/dashboard/_mvp/types";

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
  useCreateMintRequestMutation,
  useDashboardStateQuery,
} from "@/lib/queries/dashboard";
import { useMeQuery } from "@/lib/queries/auth";
import { hasAccessPermission, type UserAccess } from "@/lib/rbac/route-access";

type MintFormState = {
  amount: string;
  paymentRef: string;
  destination: string;
  sourceAccount: string;
  note: string;
};

type MintFormErrors = Partial<Record<keyof MintFormState, string>>;

type SubmissionState = "idle" | "submitting" | "success" | "error";

const initialFormState: MintFormState = {
  amount: "",
  paymentRef: "",
  destination: "",
  sourceAccount: "primary",
  note: "",
};

const statusFilterOptions = [
  "all",
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "completed",
] as const;

function canCreateOwnMintRequest(access: UserAccess | null | undefined) {
  if (!access) {
    return false;
  }
  if (access.roleSlugs.includes("read_only")) {
    return false;
  }
  return hasAccessPermission(access, "dashboard.view");
}

function validateMintForm(
  input: MintFormState,
  availableDestinations: Set<string>,
): MintFormErrors {
  const errors: MintFormErrors = {};
  const amount = Number(input.amount);

  if (!input.amount || Number.isNaN(amount) || amount <= 0) {
    errors.amount = "Enter an amount greater than 0.";
  }
  if (!input.paymentRef.trim()) {
    errors.paymentRef = "Payment reference is required.";
  }
  if (!input.destination.trim()) {
    errors.destination = "Destination wallet is required.";
  } else if (!availableDestinations.has(input.destination.trim().toLowerCase())) {
    errors.destination = "Select one of your wallet addresses.";
  }

  return errors;
}

function toMintColumns(
  onOpen: (request: MintRequest) => void,
  tt: (en: string) => string,
): MvpTableColumn<MintRequest>[] {
  return [
    {
      id: "requestId",
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
      id: "paymentRef",
      header: tt("Payment Ref"),
      cell: (row) => row.paymentRef,
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
    {
      id: "actions",
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
  const createMintRequestMutation = useCreateMintRequestMutation();
  const canCreateMintRequest = canCreateOwnMintRequest(meQuery.data?.access);
  const canManageMintStatus = hasAccessPermission(
    meQuery.data?.access,
    "dashboard.manage",
  );
  const [requests, setRequests] = React.useState<MintRequest[]>([]);
  const [form, setForm] = React.useState<MintFormState>(initialFormState);
  const [errors, setErrors] = React.useState<MintFormErrors>({});
  const [submissionState, setSubmissionState] =
    React.useState<SubmissionState>("idle");
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof statusFilterOptions)[number]>("all");
  const [selectedRequest, setSelectedRequest] =
    React.useState<MintRequest | null>(null);

  React.useEffect(() => {
    if (dashboardStateQuery.data?.mintRequests) {
      setRequests(dashboardStateQuery.data.mintRequests);
    }
  }, [dashboardStateQuery.data?.mintRequests]);

  const filteredRequests = React.useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        request.requestId.toLowerCase().includes(query) ||
        request.paymentRef.toLowerCase().includes(query) ||
        request.destination.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, statusFilter]);

  const destinationOptions = React.useMemo(() => {
    const walletAddresses = dashboardStateQuery.data?.walletAddresses ?? [];
    const seen = new Set<string>();

    return walletAddresses
      .filter((wallet) => {
        const normalizedAddress = wallet.address.trim().toLowerCase();
        if (!normalizedAddress || seen.has(normalizedAddress)) {
          return false;
        }
        seen.add(normalizedAddress);
        return true;
      })
      .map((wallet) => ({
        address: wallet.address.trim(),
        label: wallet.label,
        network: wallet.network,
      }));
  }, [dashboardStateQuery.data?.walletAddresses]);

  const destinationLookup = React.useMemo(
    () =>
      new Set(
        destinationOptions.map((option) => option.address.trim().toLowerCase()),
      ),
    [destinationOptions],
  );

  const pendingAmount = requests
    .filter((request) =>
      ["submitted", "under_review", "approved"].includes(request.status),
    )
    .reduce((total, request) => total + request.amount, 0);

  const columns = React.useMemo(
    () => toMintColumns(setSelectedRequest, tt),
    [tt],
  );

  function updateFormField<K extends keyof MintFormState>(
    field: K,
    value: MintFormState[K],
  ) {
    if (!canCreateMintRequest) {
      return;
    }
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateMintRequest) {
      return;
    }

    const validationErrors = validateMintForm(form, destinationLookup);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setSubmissionState("error");
      return;
    }

    setSubmissionState("submitting");

    try {
      await createMintRequestMutation.mutateAsync({
        amount: Number(form.amount),
        paymentRef: form.paymentRef.trim(),
        destination: form.destination.trim(),
        note: form.note.trim() || undefined,
      });

      const refreshed = await dashboardStateQuery.refetch();
      const newestRequest = refreshed.data?.mintRequests[0] ?? null;
      setSelectedRequest(newestRequest);
      setForm(initialFormState);
      setSubmissionState("success");
    } catch {
      setSubmissionState("error");
    }
  }

  async function handleCopyDestinationAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(tt("Address copied to clipboard."));
    } catch {
      toast.error(tt("Unable to copy wallet address."));
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Mint")}
        description={tt("Create mint requests, track open request progress, and review your recent submissions.")}
      />
      {!canCreateMintRequest ? (
        <p className="text-muted-foreground text-sm">
          {tt("This action requires request creation access.")}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
        <MvpKpiCard
          label={tt("Total outstanding requests")}
          value={formatNumber(
            requests.filter((request) =>
              ["submitted", "under_review", "approved"].includes(
                request.status,
              ),
            ).length,
          )}
          hint={tt("Open mint requests awaiting completion")}
          status="pending"
        />
        <MvpKpiCard
          label={tt("Total pending mint value")}
          value={formatCurrency(pendingAmount)}
          hint={tt("Submitted and under-review amount")}
          status="pending"
        />
      </section>

      <div className="space-y-4">
        <MvpSectionCard
          title={tt("Create mint request")}
          description={tt("Submit the minimum details required to start a mint operation.")}
        >
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="mint-amount">{tt("Amount (USD)")}</Label>
              <Input
                id="mint-amount"
                inputMode="decimal"
                value={form.amount}
                disabled={!canCreateMintRequest}
                onChange={(event) =>
                  updateFormField("amount", event.target.value)
                }
                placeholder="10000"
              />
              {errors.amount ? (
                <p className="text-destructive text-xs">{tt(errors.amount)}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mint-source">{tt("Source account")}</Label>
              <Select
                value={form.sourceAccount}
                disabled={!canCreateMintRequest}
                onValueChange={(value) =>
                  updateFormField("sourceAccount", value)
                }
              >
                <SelectTrigger id="mint-source">
                  <SelectValue placeholder={tt("Select source")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">
                    {tt("Primary settlement account")}
                  </SelectItem>
                  <SelectItem value="secondary">
                    {tt("Secondary treasury account")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mint-payment-ref">
                {tt("Payment reference")}
              </Label>
              <Input
                id="mint-payment-ref"
                value={form.paymentRef}
                disabled={!canCreateMintRequest}
                onChange={(event) =>
                  updateFormField("paymentRef", event.target.value)
                }
                placeholder="WIRE-XXXX"
              />
              {errors.paymentRef ? (
                <p className="text-destructive text-xs">
                  {tt(errors.paymentRef)}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mint-destination">
                {tt("Destination wallet")}
              </Label>
              <Select
                value={form.destination}
                disabled={
                  !canCreateMintRequest || destinationOptions.length === 0
                }
                onValueChange={(value) => updateFormField("destination", value)}
              >
                <SelectTrigger id="mint-destination">
                  <SelectValue
                    placeholder={
                      destinationOptions.length > 0
                        ? tt("Select your wallet address")
                        : tt("No wallet address available")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {destinationOptions.map((option) => (
                    <SelectItem key={option.address} value={option.address}>
                      {option.label} - {option.network} - {option.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.destination ? (
                <p className="text-destructive text-xs">
                  {tt(errors.destination)}
                </p>
              ) : null}
              {destinationOptions.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  {tt("Add a wallet address in Wallet page first.")}
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mint-note">{tt("Notes")}</Label>
              <Textarea
                id="mint-note"
                value={form.note}
                disabled={!canCreateMintRequest}
                onChange={(event) =>
                  updateFormField("note", event.target.value)
                }
                placeholder={tt("Optional context for ops team")}
                rows={4}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 md:col-span-2">
              <Button
                type="submit"
                disabled={
                  !canCreateMintRequest ||
                  destinationOptions.length === 0 ||
                  submissionState === "submitting"
                }
              >
                {submissionState === "submitting"
                  ? tt("Submitting...")
                  : tt("Submit request")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canCreateMintRequest}
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
                  {tt("Request submitted successfully.")}
                </span>
              ) : null}
            </div>
          </form>
          {submissionState === "error" && Object.keys(errors).length === 0 ? (
            <div className="pt-3">
              <MvpErrorAlert
                title={tt("Submission failed")}
                description={tt("Could not submit request. Please retry.")}
              />
            </div>
          ) : null}
        </MvpSectionCard>

        <MvpSectionCard
          title={tt("Recent mint requests")}
          description={tt("Search and filter request history.")}
          contentClassName="space-y-4"
        >
          <MvpTableToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder={tt("Search by request, payment ref, destination")}
            filters={
              <Select
                value={statusFilter}
                onValueChange={(value: (typeof statusFilterOptions)[number]) =>
                  setStatusFilter(value)
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={tt("Status")} />
                </SelectTrigger>
                <SelectContent>
                  {statusFilterOptions.map((status) => (
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
            emptyTitle={tt("No mint requests found")}
            emptyDescription={tt("Try a different filter or create a new request.")}
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
            ? `${tt("Mint Request")} ${selectedRequest.requestId}`
            : tt("Mint Request")
        }
        description={
          selectedRequest
            ? `${tt("Submitted")} ${formatDateTime(selectedRequest.submittedAt)}`
            : undefined
        }
        footer={
          selectedRequest && canManageMintStatus ? (
            <Button
              variant="outline"
              onClick={() =>
                setRequests((previous) =>
                  previous.map((request) =>
                    request.requestId === selectedRequest.requestId
                      ? {
                          ...request,
                          status: "approved",
                          updatedAt: new Date().toISOString(),
                          timeline: [
                            {
                              label: "Approved by ops",
                              timestamp: new Date().toISOString(),
                              status: "approved",
                            },
                            ...request.timeline,
                          ],
                        }
                      : request,
                  ),
                )
              }
            >
              {tt("Mark as approved")}
            </Button>
          ) : null
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
                  {tt("Payment Ref")}
                </p>
                <p className="font-medium">{selectedRequest.paymentRef}</p>
              </div>
              <div className="col-span-2 min-w-0">
                <p className="text-muted-foreground text-xs">
                  {tt("Destination")}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p
                    className="min-w-0 flex-1 truncate font-medium"
                    title={selectedRequest.destination}
                  >
                    {selectedRequest.destination}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 shrink-0 whitespace-nowrap px-2"
                    onClick={() =>
                      void handleCopyDestinationAddress(
                        selectedRequest.destination,
                      )
                    }
                  >
                    <CopyIcon className="size-3.5" />
                    {tt("Copy address")}
                  </Button>
                </div>
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
