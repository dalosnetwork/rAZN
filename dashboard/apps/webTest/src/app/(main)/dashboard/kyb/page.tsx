"use client";

import * as React from "react";

import { FileCheck2Icon, ShieldAlertIcon } from "lucide-react";
import { toast } from "sonner";

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
import { MvpTableToolbar } from "@/app/(main)/dashboard/_mvp/components/table-toolbar";

import type {
  KybSubmission,
  MvpStatus,
} from "@/app/(main)/dashboard/_mvp/types";

import { useI18n } from "@/components/providers/language-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  useDashboardStateQuery,
  useUploadKybDocumentMutation,
} from "@/lib/queries/dashboard";

const filterOptions = [
  "all",
  "not_started",
  "in_progress",
  "under_review",
  "approved",
  "rejected",
  "needs_update",
] as const;
const MAX_KYB_PDF_SIZE_BYTES = 25 * 1024 * 1024;

export default function Page() {
  const { tt } = useI18n();
  const dashboardStateQuery = useDashboardStateQuery();
  const uploadKybDocumentMutation = useUploadKybDocumentMutation();
  const checklist = dashboardStateQuery.data?.kybChecklist ?? [];
  const submissions = dashboardStateQuery.data?.kybSubmissions ?? [];
  const [pendingFilesByDocumentId, setPendingFilesByDocumentId] =
    React.useState<Record<string, File | null>>({});
  const submissionColumns = React.useMemo<MvpTableColumn<KybSubmission>[]>(
    () => [
      {
        id: "doc",
        header: tt("Document"),
        cell: (row) => tt(row.docType),
      },
      {
        id: "version",
        header: tt("Version"),
        className: "text-right",
        cell: (row) => formatNumber(row.version),
      },
      {
        id: "status",
        header: tt("Status"),
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        id: "submitted",
        header: tt("Submitted"),
        cell: (row) => formatDateTime(row.submittedAt),
      },
      {
        id: "reviewed",
        header: tt("Reviewed"),
        cell: (row) => (row.reviewedAt ? formatDateTime(row.reviewedAt) : "-"),
      },
    ],
    [tt],
  );

  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof filterOptions)[number]>("all");

  async function handleUpload(documentId: string, documentLabel: string) {
    const file = pendingFilesByDocumentId[documentId];
    if (!file) {
      toast.error(tt("Choose a PDF file before uploading."));
      return;
    }

    const isPdfMime = !file.type || file.type === "application/pdf";
    const isPdfName = file.name.toLowerCase().endsWith(".pdf");
    if (!isPdfMime || !isPdfName) {
      toast.error(tt("Only PDF documents are allowed."));
      return;
    }
    if (file.size > MAX_KYB_PDF_SIZE_BYTES) {
      toast.error(tt("PDF exceeds the 25 MB upload limit."));
      return;
    }

    try {
      await uploadKybDocumentMutation.mutateAsync({
        documentId,
        file,
      });
      setPendingFilesByDocumentId((previous) => ({
        ...previous,
        [documentId]: null,
      }));
      toast.success(`${tt("Upload submitted for review")}: ${tt(documentLabel)}`);
      await dashboardStateQuery.refetch();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tt("Could not upload KYB document."),
      );
    }
  }

  const filteredChecklist = React.useMemo(() => {
    return checklist.filter((item) => {
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 || item.label.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [checklist, search, statusFilter]);

  const completedSteps = checklist.filter(
    (item) => item.status === "approved",
  ).length;
  const requiredItems = checklist.filter((item) => item.required).length;
  const missingItems = checklist.filter(
    (item) =>
      item.required &&
      ["not_started", "needs_update", "rejected"].includes(item.status),
  );
  const progressValue =
    requiredItems === 0 ? 0 : (completedSteps / requiredItems) * 100;

  const blocked = missingItems.length > 0;
  const overallStatus: MvpStatus =
    checklist.length === 0
      ? "not_started"
      : blocked
        ? "needs_update"
        : "approved";
  const overallStatusLabel =
    overallStatus === "not_started"
      ? "Not Started"
      : overallStatus === "needs_update"
        ? "Needs Update"
        : "Approved";

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <MvpPageHeader
        title={tt("KYB")}
        description={tt("Manage verification status, upload missing items, and track review feedback.")}
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
        <MvpKpiCard
          label={tt("Overall status")}
          value={tt(overallStatusLabel)}
          hint={tt("Current verification gate")}
          status={overallStatus}
        />
        <MvpKpiCard
          label={tt("Required docs")}
          value={`${completedSteps}/${requiredItems}`}
          hint={tt("Approved required documents")}
          status={blocked ? "warning" : "active"}
        />
      </section>

      <MvpSectionCard
        title={tt("Verification progress")}
        description={tt("Progress across required KYB steps.")}
        contentClassName="space-y-3"
      >
        <Progress value={progressValue} />
        <p className="text-muted-foreground text-xs">
          {completedSteps} {tt("of")} {requiredItems}{" "}
          {tt("required items approved.")}
        </p>
        {blocked ? (
          <Alert>
            <ShieldAlertIcon className="size-4" />
            <AlertTitle>{tt("Verification blocked")}</AlertTitle>
            <AlertDescription>
              {tt(
                "Submit missing or outdated items to continue mint and redeem operations.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}
      </MvpSectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <MvpSectionCard
            title={tt("Required information and documents")}
            description={tt("Upload or re-upload missing KYB items.")}
            contentClassName="space-y-4"
          >
            <MvpTableToolbar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder={tt("Search documents")}
              filters={
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as (typeof filterOptions)[number],
                    )
                  }
                >
                  {filterOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === "all"
                        ? tt("All statuses")
                        : tt(status.replaceAll("_", " "))}
                    </option>
                  ))}
                </select>
              }
            />

            <div className="space-y-3">
              {filteredChecklist.map((item) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{tt(item.label)}</p>
                      <p className="text-muted-foreground text-xs">
                        {tt("Category")}:{" "}
                        {tt(item.category.replaceAll("_", " "))}
                      </p>
                      {item.note ? (
                        <p className="mt-1 text-muted-foreground text-xs">
                          {tt(item.note)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                      {item.required ? (
                        <span className="rounded-md bg-muted px-2 py-1 text-xs">
                          {tt("Required")}
                        </span>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-1 text-xs">
                          {tt("Optional")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {item.uploadedAt ? (
                      <p className="text-muted-foreground text-xs">
                        {tt("Last upload")}: {formatDateTime(item.uploadedAt)}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        {tt("No submission has been synced for this document yet.")}
                      </p>
                    )}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="block w-full cursor-pointer rounded-md border bg-background px-3 py-2 text-xs md:max-w-sm"
                        onChange={(event) => {
                          const selectedFile = event.target.files?.[0] ?? null;
                          setPendingFilesByDocumentId((previous) => ({
                            ...previous,
                            [item.id]: selectedFile,
                          }));
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => void handleUpload(item.id, item.label)}
                        disabled={
                          uploadKybDocumentMutation.isPending ||
                          !pendingFilesByDocumentId[item.id]
                        }
                      >
                        {uploadKybDocumentMutation.isPending
                          ? tt("Uploading...")
                          : tt("Upload PDF")}
                      </Button>
                    </div>
                    {pendingFilesByDocumentId[item.id] ? (
                      <p className="text-muted-foreground text-xs">
                        {tt("Selected file")}: {pendingFilesByDocumentId[item.id]?.name}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-xs">
                      {tt("Only PDF files are accepted. Max size: 25 MB.")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Alert>
              <FileCheck2Icon className="size-4" />
              <AlertTitle>{tt("Document security policy")}</AlertTitle>
              <AlertDescription>
                {tt(
                  "Uploads are validated server-side (PDF signature and file size) and renamed before storage.",
                )}
              </AlertDescription>
            </Alert>
          </MvpSectionCard>

          <MvpSectionCard
            title={tt("Submission history")}
            description={tt("Previous submissions and current review outcomes.")}
          >
            <MvpSimpleTable
              columns={submissionColumns}
              data={submissions}
              getRowId={(row) =>
                `${row.docType}-${row.version}-${row.submittedAt}`
              }
              emptyTitle={tt("No submissions")}
              emptyDescription={tt("Upload documents to create a KYB submission record.")}
            />
          </MvpSectionCard>
        </div>
      </div>
    </div>
  );
}
