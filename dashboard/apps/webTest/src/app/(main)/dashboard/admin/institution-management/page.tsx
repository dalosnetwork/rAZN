"use client";

import * as React from "react";

import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { MvpDetailDrawer } from "@/app/(main)/dashboard/_mvp/components/detail-drawer";
import {
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
import {
  MvpErrorAlert,
  MvpInlineLoading,
} from "@/app/(main)/dashboard/_mvp/components/state-blocks";

import type {
  KybReviewCase,
} from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAdminInstitutionDocumentDownloadUrl } from "@/lib/api/dashboard";
import { useMeQuery } from "@/lib/queries/auth";
import {
  useDisableAdminInstitutionProfileMutation,
  useOnboardAdminInstitutionMutation,
  useUpdateAdminBankAccountStatusMutation,
  useAdminInstitutionsQuery,
  useUpdateAdminInstitutionDocumentStatusMutation,
  useUpdateAdminInstitutionStatusMutation,
  useUpdateAdminWalletStatusMutation,
} from "@/lib/queries/dashboard";
import { hasAccessPermission } from "@/lib/rbac/route-access";

const filterOptions = [
  "all",
  "not_started",
  "in_progress",
  "under_review",
  "approved",
  "rejected",
  "needs_update",
] as const;

function truncateMiddle(value: string, start = 10, end = 8) {
  const normalized = value.trim();
  if (!normalized) {
    return "-";
  }
  if (normalized.length <= start + end + 3) {
    return normalized;
  }
  return `${normalized.slice(0, start)}...${normalized.slice(-end)}`;
}

function buildColumns(
  onOpen: (customerId: string) => void,
  tt: (en: string) => string,
): MvpTableColumn<KybReviewCase>[] {
  return [
    {
      id: "customerId",
      header: tt("Customer ID"),
      cell: (row) => (
        <span className="block max-w-[18rem] break-all">{row.customerId}</span>
      ),
    },
    {
      id: "customerName",
      header: tt("Customer name"),
      cell: (row) => row.customerName,
    },
    {
      id: "contactEmail",
      header: tt("Customer contact email"),
      cell: (row) => row.contactEmail,
    },
    {
      id: "status",
      header: tt("KYB status"),
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: "country",
      header: tt("Country"),
      cell: (row) => row.country,
    },
    {
      id: "registrationDate",
      header: tt("Registration date"),
      cell: (row) => formatDateTime(row.registrationDate),
    },
    {
      id: "action",
      header: tt("Details"),
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpen(row.customerId)}
        >
          {tt("Open")}
        </Button>
      ),
    },
  ];
}

export default function Page() {
  const { tt, tx } = useI18n();
  const meQuery = useMeQuery();
  const adminInstitutionsQuery = useAdminInstitutionsQuery();
  const onboardInstitutionMutation = useOnboardAdminInstitutionMutation();
  const updateInstitutionStatusMutation = useUpdateAdminInstitutionStatusMutation();
  const updateDocumentStatusMutation =
    useUpdateAdminInstitutionDocumentStatusMutation();
  const updateBankAccountStatusMutation = useUpdateAdminBankAccountStatusMutation();
  const updateWalletStatusMutation = useUpdateAdminWalletStatusMutation();
  const disableInstitutionProfileMutation =
    useDisableAdminInstitutionProfileMutation();
  const canManageBankApprovals = hasAccessPermission(
    meQuery.data?.access,
    "offchain.fiat_movements",
  );
  const canManageWalletApprovals =
    hasAccessPermission(meQuery.data?.access, "offchain.fiat_movements") ||
    hasAccessPermission(meQuery.data?.access, "offchain.emergency") ||
    hasAccessPermission(meQuery.data?.access, "token.pause");
  const cases = React.useMemo<KybReviewCase[]>(
    () => (adminInstitutionsQuery.data as KybReviewCase[] | undefined) ?? [],
    [adminInstitutionsQuery.data],
  );
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof filterOptions)[number]>("all");
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(
    null,
  );
  const [draftNote, setDraftNote] = React.useState("");
  const selectedCase = React.useMemo(
    () => cases.find((item) => item.customerId === selectedCaseId) ?? null,
    [cases, selectedCaseId],
  );

  React.useEffect(() => {
    if (!selectedCaseId) {
      return;
    }
    const stillExists = cases.some((item) => item.customerId === selectedCaseId);
    if (!stillExists) {
      setSelectedCaseId(null);
    }
  }, [cases, selectedCaseId]);

  const filteredCases = React.useMemo(
    () =>
      cases.filter((item) => {
        const query = search.trim().toLowerCase();
        const matchesSearch =
          query.length === 0 ||
          item.customerId.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query) ||
          item.contactEmail.toLowerCase().includes(query);
        const matchesStatus =
          statusFilter === "all" || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [cases, search, statusFilter],
  );

  const columns = React.useMemo(
    () => buildColumns(setSelectedCaseId, tt),
    [tt],
  );

  const totalCustomers = cases.length;
  const newRegistrationCount = cases.filter((item) => {
    const now = Date.now();
    const registrationTime = new Date(item.registrationDate).getTime();
    const daysFromNow = (now - registrationTime) / (1000 * 60 * 60 * 24);
    return daysFromNow <= 30;
  }).length;
  const outstandingKybCount = cases.filter((item) =>
    ["not_started", "in_progress", "under_review", "needs_update"].includes(
      item.status,
    ),
  ).length;

  async function onboardInstitution(caseRef: string) {
    try {
      await onboardInstitutionMutation.mutateAsync({ caseRef });
      await adminInstitutionsQuery.refetch();
      toast.success(tt("Customer onboarded."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not onboard customer."),
      );
    }
  }

  async function updateKybCaseStatus(
    caseRef: string,
    status:
      | "in_progress"
      | "under_review"
      | "approved"
      | "rejected"
      | "needs_update"
      | "blocked",
  ) {
    const note = draftNote.trim() || undefined;

    try {
      await updateInstitutionStatusMutation.mutateAsync({
        caseRef,
        status,
        note,
      });
      await adminInstitutionsQuery.refetch();
      toast.success(tt("KYB status updated."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not update KYB status."),
      );
    }
  }

  async function updateBankAccountStatus(
    bankAccountId: string,
    status: "pending" | "under_review" | "verified" | "rejected" | "inactive",
  ) {
    const note = draftNote.trim() || undefined;

    try {
      await updateBankAccountStatusMutation.mutateAsync({
        bankAccountId,
        status,
        note,
      });
      await adminInstitutionsQuery.refetch();
      toast.success(tt("Bank account status updated."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not update bank account."),
      );
    }
  }

  async function updateWalletStatus(
    walletAddressId: string,
    status: "pending" | "under_review" | "verified" | "rejected" | "inactive",
  ) {
    const note = draftNote.trim() || undefined;

    try {
      await updateWalletStatusMutation.mutateAsync({
        walletAddressId,
        status,
        note,
      });
      await adminInstitutionsQuery.refetch();
      toast.success(tt("Wallet status updated."));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tt("Could not update wallet."),
      );
    }
  }

  async function updateDocumentStatus(
    caseRef: string,
    documentId: string,
    status: "under_review" | "approved" | "rejected" | "needs_update",
  ) {
    const note = draftNote.trim() || undefined;

    try {
      await updateDocumentStatusMutation.mutateAsync({
        caseRef,
        documentId,
        status,
        note,
      });
      await adminInstitutionsQuery.refetch();
      toast.success(tt("Document review updated."));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not update document review."),
      );
    }
  }

  async function disableInstitutionProfile(caseRef: string) {
    const confirmed = window.confirm(
      tt(
        "Disable this profile? This will revoke all active sessions and remove password login access.",
      ),
    );
    if (!confirmed) {
      return;
    }

    try {
      await disableInstitutionProfileMutation.mutateAsync({ caseRef });
      await adminInstitutionsQuery.refetch();
      setSelectedCaseId(null);
      setDraftNote("");
      toast.success(
        tt("Customer profile disabled. Active sessions revoked and password access removed."),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not disable customer profile."),
      );
    }
  }

  async function downloadDocument(caseRef: string, documentId: string) {
    try {
      const response = await fetch(
        getAdminInstitutionDocumentDownloadUrl(caseRef, documentId),
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? tt("Could not download document."));
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const encodedFileName =
        /filename="([^"]+)"/i.exec(contentDisposition)?.[1] ?? "kyb-document.pdf";

      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = encodedFileName;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : tt("Could not download document."),
      );
    }
  }

  async function copyBankValue(value: string, label: string) {
    const normalizedValue = value.trim();
    if (!normalizedValue || normalizedValue === "-") {
      toast.error(tt(`${label} is not available.`));
      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedValue);
      toast.success(tt(`${label} copied to clipboard.`));
    } catch {
      toast.error(tt(`Could not copy ${label}.`));
    }
  }

  const selectedCaseBankAccounts = React.useMemo(() => {
    if (!selectedCase) {
      return [];
    }
    if (selectedCase.bankAccounts.length > 0) {
      return selectedCase.bankAccounts;
    }
    if (selectedCase.bankDetails.bankAccountId) {
      return [
        {
          bankAccountId: selectedCase.bankDetails.bankAccountId,
          bankName: selectedCase.bankDetails.bankName,
          accountName: selectedCase.bankDetails.accountName,
          ibanMasked: selectedCase.bankDetails.ibanMasked,
          accountNumberMasked: selectedCase.bankDetails.accountNumberMasked ?? "-",
          swiftCode: selectedCase.bankDetails.swiftCode,
          status: selectedCase.bankDetails.status,
          addedAt: selectedCase.bankDetails.addedAt ?? new Date(0).toISOString(),
          isPrimary: true,
          country: selectedCase.country,
          currency: "USD",
        },
      ];
    }
    return [];
  }, [selectedCase]);

  const selectedCaseWalletAccounts = React.useMemo(() => {
    if (!selectedCase) {
      return [];
    }
    if (selectedCase.walletAccounts.length > 0) {
      return selectedCase.walletAccounts;
    }
    if (selectedCase.walletDetails.walletAddress !== "-") {
      return [
        {
          walletAddressId: "",
          label: tt("Linked wallet"),
          walletAddress: selectedCase.walletDetails.walletAddress,
          network: selectedCase.walletDetails.network,
          walletProvider: selectedCase.walletDetails.walletProvider,
          verificationStatus: "pending" as const,
          connectionStatus: "connected" as const,
          addedAt: selectedCase.registrationDate,
          isPrimary: true,
        },
      ];
    }
    return [];
  }, [selectedCase, tt]);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("Institution Management")}
        description={tt("Manage customers, track KYB verification, and review customer compliance details.")}
      />
      {adminInstitutionsQuery.isLoading ? <MvpInlineLoading /> : null}
      {adminInstitutionsQuery.error ? (
        <MvpErrorAlert
          title={tt("Could not load institution cases")}
          description={adminInstitutionsQuery.error.message}
        />
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MvpKpiCard
          label={tt("Total customers")}
          value={formatNumber(totalCustomers)}
          hint={tt("All registered institution customers")}
          status="active"
        />
        <MvpKpiCard
          label={tt("New customer registrations")}
          value={formatNumber(newRegistrationCount)}
          hint={tt("Registered in the last 30 days")}
          status="submitted"
        />
        <MvpKpiCard
          label={tt("Outstanding KYB verification")}
          value={formatNumber(outstandingKybCount)}
          hint={tt("Customers pending KYB completion")}
          status="needs_update"
        />
      </section>

      <MvpSectionCard
        title={tt("Customer table")}
        description={tt("View customer registration and KYB profile details.")}
        contentClassName="space-y-4"
      >
        <MvpTableToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={tt("Search customer ID, name, or email")}
          filters={
            <Select
              value={statusFilter}
              onValueChange={(value: (typeof filterOptions)[number]) =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={tt("Status")} />
              </SelectTrigger>
              <SelectContent>
                {filterOptions.map((status) => (
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
          data={filteredCases}
          getRowId={(row) => row.customerId}
          emptyTitle={tt("No customers found")}
          emptyDescription={tt("No customer records match the selected filters.")}
        />
      </MvpSectionCard>

      <MvpDetailDrawer
        open={Boolean(selectedCase)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCaseId(null);
            setDraftNote("");
          }
        }}
        title={
          selectedCase
            ? `${tt("Customer")} ${selectedCase.customerId}`
            : tt("Customer details")
        }
        description={
          selectedCase
            ? `${selectedCase.customerName} • ${tt("registered")} ${formatDateTime(selectedCase.registrationDate)}`
            : undefined
        }
        footer={
          selectedCase ? (
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => void onboardInstitution(selectedCase.customerId)}
                disabled={
                  onboardInstitutionMutation.isPending ||
                  selectedCase.onboardingStatus === "approved"
                }
              >
                {selectedCase.onboardingStatus === "approved"
                  ? tt("Already onboarded")
                  : tt("Onboard")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void updateKybCaseStatus(selectedCase.customerId, "approved")
                }
                disabled={updateInstitutionStatusMutation.isPending}
              >
                {tt("Approve KYB")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void updateKybCaseStatus(
                    selectedCase.customerId,
                    "needs_update",
                  )
                }
                disabled={updateInstitutionStatusMutation.isPending}
              >
                {tt("Request KYB update")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void updateKybCaseStatus(selectedCase.customerId, "rejected")
                }
                disabled={updateInstitutionStatusMutation.isPending}
              >
                {tt("Reject KYB")}
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  void disableInstitutionProfile(selectedCase.customerId)
                }
                disabled={disableInstitutionProfileMutation.isPending}
              >
                {tt("Disable profile")}
              </Button>
            </div>
          ) : null
        }
      >
        {selectedCase ? (
          <>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-sm">{tt("KYB status")}:</p>
                <StatusBadge status={selectedCase.status} />
                <p className="font-medium text-sm">{tt("Onboarding")}:</p>
                <StatusBadge status={selectedCase.onboardingStatus} />
                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                  {tt("Risk")} {tt(selectedCase.riskLevel)}
                </span>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="font-medium text-sm">{tt("All customer info")}</p>
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground text-xs">
                    {tt("Customer ID")}
                  </p>
                  <p className="break-all font-medium">{selectedCase.customerId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {tt("Customer name")}
                  </p>
                  <p className="font-medium">{selectedCase.customerName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {tt("Customer contact email")}
                  </p>
                  <p className="font-medium">{selectedCase.contactEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">{tt("Country")}</p>
                  <p className="font-medium">{selectedCase.country}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {tt("Registration date")}
                  </p>
                  <p className="font-medium">
                    {formatDateTime(selectedCase.registrationDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {tt("KYB submission")}
                  </p>
                  <p className="font-medium">
                    {formatDateTime(selectedCase.submittedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="font-medium text-sm">
                {tt("Customer bank and wallet details")}
              </p>
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div className="space-y-1 rounded-md border bg-muted/20 p-3">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    {tt("Bank details")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {tt("Linked bank accounts")}: {selectedCaseBankAccounts.length}
                  </p>
                  {selectedCaseBankAccounts.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {selectedCaseBankAccounts.map((account) => (
                        <div
                          key={account.bankAccountId}
                          className="rounded-md border bg-background/60 p-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">
                              {account.bankName}
                              {account.isPrimary ? (
                                <span className="ml-2 text-muted-foreground text-xs">
                                  ({tt("Primary account")})
                                </span>
                              ) : null}
                            </p>
                            <StatusBadge status={account.status} />
                          </div>
                          <p>
                            <span className="text-muted-foreground">
                              {tt("Account name")}:
                            </span>{" "}
                            {account.accountName}
                          </p>
                          <p className="flex flex-wrap items-center gap-1">
                            <span className="text-muted-foreground">{tt("IBAN")}:</span>
                            <span className="font-mono text-xs">{account.ibanMasked}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={
                                account.ibanMasked.trim() === "-" ||
                                account.ibanMasked.trim() === ""
                              }
                              onClick={() => void copyBankValue(account.ibanMasked, "IBAN")}
                            >
                              <CopyIcon className="size-3.5" />
                              <span className="sr-only">{tt("Copy IBAN")}</span>
                            </Button>
                          </p>
                          <p className="flex flex-wrap items-center gap-1">
                            <span className="text-muted-foreground">
                              {tt("Account number")}:
                            </span>
                            <span className="font-mono text-xs">
                              {account.accountNumberMasked ?? "-"}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              disabled={
                                (account.accountNumberMasked ?? "").trim() === "-" ||
                                (account.accountNumberMasked ?? "").trim() === ""
                              }
                              onClick={() =>
                                void copyBankValue(
                                  account.accountNumberMasked ?? "",
                                  tt("Account number"),
                                )
                              }
                            >
                              <CopyIcon className="size-3.5" />
                              <span className="sr-only">{tt("Copy account number")}</span>
                            </Button>
                          </p>
                          <p>
                            <span className="text-muted-foreground">{tt("SWIFT")}:</span>{" "}
                            {account.swiftCode}
                          </p>
                          <p>
                            <span className="text-muted-foreground">{tt("Country")}:</span>{" "}
                            {account.country} • {account.currency}
                          </p>
                          <p>
                            <span className="text-muted-foreground">{tt("Added")}:</span>{" "}
                            {formatDateTime(account.addedAt)}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              size="sm"
                              disabled={
                                !canManageBankApprovals ||
                                updateBankAccountStatusMutation.isPending
                              }
                              onClick={() =>
                                void updateBankAccountStatus(
                                  account.bankAccountId,
                                  "verified",
                                )
                              }
                            >
                              {tt("Approve bank account")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !canManageBankApprovals ||
                                updateBankAccountStatusMutation.isPending
                              }
                              onClick={() =>
                                void updateBankAccountStatus(
                                  account.bankAccountId,
                                  "rejected",
                                )
                              }
                            >
                              {tt("Reject bank account")}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs pt-2">
                      {tt("No linked bank account found for this customer.")}
                    </p>
                  )}
                </div>
                <div className="space-y-1 rounded-md border bg-muted/20 p-3">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    {tt("Wallet details")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {tt("Linked wallets")}: {selectedCaseWalletAccounts.length}
                  </p>
                  {selectedCaseWalletAccounts.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      {selectedCaseWalletAccounts.map((wallet) => (
                        <div
                          key={`${wallet.walletAddressId || wallet.walletAddress}-${wallet.network}`}
                          className="rounded-md border bg-background/60 p-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">
                              {wallet.label}
                              {wallet.isPrimary ? (
                                <span className="ml-2 text-muted-foreground text-xs">
                                  ({tt("Primary wallet")})
                                </span>
                              ) : null}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={wallet.connectionStatus} />
                              <StatusBadge status={wallet.verificationStatus} />
                            </div>
                          </div>
                          <p>
                            <span className="text-muted-foreground">
                              {tt("Wallet address")}:
                            </span>{" "}
                            <span
                              className="font-mono text-xs"
                              title={wallet.walletAddress}
                            >
                              {truncateMiddle(wallet.walletAddress)}
                            </span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              {tt("Network")}:
                            </span>{" "}
                            {wallet.network}
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              {tt("Provider")}:
                            </span>{" "}
                            {wallet.walletProvider}
                          </p>
                          <p>
                            <span className="text-muted-foreground">{tt("Added")}:</span>{" "}
                            {formatDateTime(wallet.addedAt)}
                          </p>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button
                              size="sm"
                              disabled={
                                !wallet.walletAddressId ||
                                !canManageWalletApprovals ||
                                updateWalletStatusMutation.isPending
                              }
                              onClick={() =>
                                void updateWalletStatus(
                                  wallet.walletAddressId,
                                  "verified",
                                )
                              }
                            >
                              {tt("Approve wallet")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !wallet.walletAddressId ||
                                !canManageWalletApprovals ||
                                updateWalletStatusMutation.isPending
                              }
                              onClick={() =>
                                void updateWalletStatus(
                                  wallet.walletAddressId,
                                  "rejected",
                                )
                              }
                            >
                              {tt("Reject wallet")}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs pt-2">
                      {tt("No linked wallet found for this customer.")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="font-medium text-sm">
                {tt("Supporting documents for KYB")}
              </p>
              {selectedCase.documents.length === 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/20 p-3">
                  <p className="text-sm text-muted-foreground">
                    {tt("No KYB checklist yet. Initialize the KYB case to start document review.")}
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      void updateKybCaseStatus(
                        selectedCase.customerId,
                        "in_progress",
                      )
                    }
                    disabled={updateInstitutionStatusMutation.isPending}
                  >
                    {tt("Initialize KYB checklist")}
                  </Button>
                </div>
              ) : null}
              {selectedCase.documents.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <div>
                    <p>{tt(document.label)}</p>
                    {document.note ? (
                      <p className="text-muted-foreground text-xs">
                        {tt(document.note)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StatusBadge status={document.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void downloadDocument(selectedCase.customerId, document.id)
                      }
                    >
                      {tt("Download")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={updateDocumentStatusMutation.isPending}
                      onClick={() =>
                        void updateDocumentStatus(
                          selectedCase.customerId,
                          document.id,
                          "approved",
                        )
                      }
                    >
                      {tt("Approve file")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updateDocumentStatusMutation.isPending}
                      onClick={() =>
                        void updateDocumentStatus(
                          selectedCase.customerId,
                          document.id,
                          "needs_update",
                        )
                      }
                    >
                      {tt("Request re-upload")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="font-medium text-sm">{tt("Notes")}</p>
              <Textarea
                rows={5}
                value={draftNote}
                onChange={(event) => setDraftNote(event.target.value)}
                placeholder={tt(selectedCase.notes)}
              />
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="font-medium text-sm">{tt("Contact customer?")}</p>
              <p className="text-sm text-muted-foreground">
                {tt("Reach out directly for missing files or KYB clarifications.")}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  window.location.href = `mailto:${selectedCase.contactEmail}`;
                }}
              >
                {tt("Contact customer")}
              </Button>
            </div>

            <StatusTimeline entries={selectedCase.history} />
          </>
        ) : null}
      </MvpDetailDrawer>
    </div>
  );
}
