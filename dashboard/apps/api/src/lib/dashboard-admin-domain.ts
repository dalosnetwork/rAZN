import {
  bankAccountsTable,
  kybCaseDocumentsTable,
  kybCaseEventsTable,
  kybCasesTable,
  kybDocumentSubmissionsTable,
  managedWalletAddressesTable,
  mintRequestsTable,
  redeemRequestsTable,
  requestEventsTable,
  reserveSnapshotAllocationsTable,
  reserveSnapshotEventsTable,
  reserveSnapshotsTable,
  userTable,
  walletActivityEventsTable,
  walletConnectionsTable,
} from "@repo/db";
import { hasAdminRole } from "@repo/auth/rbac";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import {
  getMintOpsQueueForAdmin,
  getRedemptionOpsQueueForAdmin,
} from "./dashboard-domain";
import { db } from "./db";
import {
  KYB_FILE_STORAGE_ERRORS,
  readKybPdfFile,
} from "./kyb-file-storage";
import { listUsersWithRoles } from "./users";

type NumberLike = string | number | null | undefined;

function toNumber(value: NumberLike) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return new Date(0).toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toISOString();
}

async function getUserProfileMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, { name: string; email: string; createdAt: Date }>();
  }

  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .where(and(inArray(userTable.id, userIds), isNull(userTable.deletedAt)));

  return new Map(
    rows.map((row) => [
      row.id,
      {
        name: row.name,
        email: row.email,
        createdAt: row.createdAt,
      },
    ]),
  );
}

export type AdminOverviewState = {
  kpis: {
    totalCirculatingSupply: number;
    reserveCoverage: number;
    outstandingMintValue: number;
    monthlySupplyGrowthRate: number;
    outstandingRedemptionValue: number;
  };
  recentActivity: {
    id: string;
    actor: string;
    action: string;
    status: string;
    timestamp: string;
  }[];
  transactionOversight: {
    id: string;
    reference: string;
    type: "Mint" | "Redeem";
    network: string;
    amount: number;
    updatedAt: string;
    status: string;
  }[];
};

export async function getAdminOverviewState(): Promise<AdminOverviewState> {
  const [mintQueue, redeemQueue, reserveRows, recentEventRows] =
    await Promise.all([
      getMintOpsQueueForAdmin(),
      getRedemptionOpsQueueForAdmin(),
      db
        .select()
        .from(reserveSnapshotsTable)
        .where(eq(reserveSnapshotsTable.snapshotScope, "public"))
        .orderBy(asc(reserveSnapshotsTable.snapshotAt)),
      db
        .select({
          id: requestEventsTable.id,
          label: requestEventsTable.label,
          status: requestEventsTable.status,
          occurredAt: requestEventsTable.occurredAt,
          actorLabel: requestEventsTable.actorLabel,
          mintRequestRef: mintRequestsTable.requestRef,
          redeemRequestRef: redeemRequestsTable.requestRef,
        })
        .from(requestEventsTable)
        .leftJoin(
          mintRequestsTable,
          eq(requestEventsTable.mintRequestId, mintRequestsTable.id),
        )
        .leftJoin(
          redeemRequestsTable,
          eq(requestEventsTable.redeemRequestId, redeemRequestsTable.id),
        )
        .orderBy(desc(requestEventsTable.occurredAt))
        .limit(50),
    ]);

  const latestReserveSnapshot = reserveRows[reserveRows.length - 1];
  const baselineReserveSnapshot = reserveRows[0];
  const latestSupply = toNumber(latestReserveSnapshot?.liabilitiesAmount);
  const baselineSupply = toNumber(baselineReserveSnapshot?.liabilitiesAmount);
  const monthlySupplyGrowthRate =
    baselineSupply > 0 ? ((latestSupply - baselineSupply) / baselineSupply) * 100 : 0;

  const outstandingMintValue = mintQueue
    .filter((item) =>
      ["submitted", "pending", "under_review", "approved"].includes(item.status),
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const outstandingRedemptionValue = redeemQueue
    .filter((item) =>
      ["submitted", "queued", "processing", "approved"].includes(item.status),
    )
    .reduce((sum, item) => sum + item.amount, 0);

  const recentActivity = recentEventRows.map((row) => {
    const ref = row.mintRequestRef ?? row.redeemRequestRef;
    return {
      id: row.id,
      actor: row.actorLabel ?? "System",
      action: ref ? `${row.label} (${ref})` : row.label,
      status: row.status,
      timestamp: toIso(row.occurredAt),
    };
  });

  const transactionOversight = [
    ...mintQueue.map((request) => ({
      id: `mint-${request.requestId}`,
      reference: request.requestId,
      type: "Mint" as const,
      network: request.destinationAccount ? "Ethereum" : "Ethereum",
      amount: request.amount,
      updatedAt:
        request.timeline[0]?.timestamp ?? request.submittedAt ?? new Date(0).toISOString(),
      status: request.status,
    })),
    ...redeemQueue.map((request) => ({
      id: `redeem-${request.requestId}`,
      reference: request.requestId,
      type: "Redeem" as const,
      network: "Bank Rail",
      amount: request.amount,
      updatedAt:
        request.timeline[0]?.timestamp ?? request.submittedAt ?? new Date(0).toISOString(),
      status: request.status,
    })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);

  return {
    kpis: {
      totalCirculatingSupply: latestSupply,
      reserveCoverage: toNumber(latestReserveSnapshot?.coverageRatio),
      outstandingMintValue,
      monthlySupplyGrowthRate,
      outstandingRedemptionValue,
    },
    recentActivity,
    transactionOversight,
  };
}

export type AdminKybCase = {
  customerId: string;
  customerName: string;
  contactEmail: string;
  country: string;
  registrationDate: string;
  submittedAt: string;
  status: string;
  reviewer: string;
  riskLevel: "low" | "medium" | "high";
  bankDetails: {
    bankAccountId?: string;
    bankName: string;
    accountName: string;
    ibanMasked: string;
    swiftCode: string;
    status: string;
    addedAt?: string;
  };
  bankAccounts: {
    bankAccountId: string;
    bankName: string;
    accountName: string;
    ibanMasked: string;
    swiftCode: string;
    status: string;
    addedAt: string;
    isPrimary: boolean;
    country: string;
    currency: string;
  }[];
  walletDetails: {
    network: string;
    walletAddress: string;
    walletProvider: string;
  };
  documents: {
    id: string;
    label: string;
    category: "identity" | "address" | "source_of_funds" | "business";
    status: string;
    required: boolean;
    uploadedAt?: string;
    note?: string;
  }[];
  notes: string;
  history: {
    label: string;
    timestamp: string;
    status: string;
    actor?: string;
    note?: string;
  }[];
};

export async function getAdminKybCases(): Promise<AdminKybCase[]> {
  const customerUsers = (await listUsersWithRoles(500)).filter(
    (user) => user.roles.includes("user") && !hasAdminRole(user.roles),
  );

  if (customerUsers.length === 0) {
    return [];
  }

  const customerUserIds = customerUsers.map((user) => user.id);
  const caseRows = await db
    .select()
    .from(kybCasesTable)
    .where(inArray(kybCasesTable.userId, customerUserIds))
    .orderBy(desc(kybCasesTable.submittedAt))
    .limit(1000);

  const latestCaseByUserId = new Map<string, (typeof caseRows)[number]>();
  for (const row of caseRows) {
    if (!latestCaseByUserId.has(row.userId)) {
      latestCaseByUserId.set(row.userId, row);
    }
  }
  const latestCases = [...latestCaseByUserId.values()];

  const userIds = Array.from(
    new Set([
      ...customerUserIds,
      ...latestCases
        .map((row) => row.reviewerUserId)
        .filter((value): value is string => Boolean(value)),
    ]),
  );
  const caseIds = latestCases.map((row) => row.id);
  const [userMap, bankRows, walletAddressRows, walletConnectionRows, documents, events] =
    await Promise.all([
      getUserProfileMap(userIds),
      db
        .select()
        .from(bankAccountsTable)
        .where(inArray(bankAccountsTable.userId, userIds))
        .orderBy(desc(bankAccountsTable.isPrimary), desc(bankAccountsTable.createdAt)),
      db
        .select()
        .from(managedWalletAddressesTable)
        .where(inArray(managedWalletAddressesTable.userId, userIds))
        .orderBy(desc(managedWalletAddressesTable.addedAt)),
      db
        .select()
        .from(walletConnectionsTable)
        .where(inArray(walletConnectionsTable.userId, userIds))
        .orderBy(desc(walletConnectionsTable.createdAt)),
      caseIds.length
        ? db
            .select()
            .from(kybCaseDocumentsTable)
            .where(inArray(kybCaseDocumentsTable.kybCaseId, caseIds))
            .orderBy(asc(kybCaseDocumentsTable.createdAt))
        : Promise.resolve([]),
      caseIds.length
        ? db
            .select()
            .from(kybCaseEventsTable)
            .where(inArray(kybCaseEventsTable.kybCaseId, caseIds))
            .orderBy(desc(kybCaseEventsTable.occurredAt))
        : Promise.resolve([]),
    ]);

  const bankByUserId = new Map<string, (typeof bankRows)[number]>();
  const bankAccountsByUserId = new Map<
    string,
    AdminKybCase["bankAccounts"]
  >();
  for (const row of bankRows) {
    if (!bankByUserId.has(row.userId)) {
      bankByUserId.set(row.userId, row);
    }
    const current = bankAccountsByUserId.get(row.userId) ?? [];
    current.push({
      bankAccountId: row.id,
      bankName: row.bankName,
      accountName: row.accountHolder,
      ibanMasked: row.ibanMasked,
      swiftCode: row.swiftCode ?? "-",
      status: row.status,
      addedAt: toIso(row.createdAt),
      isPrimary: row.isPrimary,
      country: row.country,
      currency: row.currency,
    });
    bankAccountsByUserId.set(row.userId, current);
  }

  const walletByUserId = new Map<string, (typeof walletAddressRows)[number]>();
  for (const row of walletAddressRows) {
    if (!walletByUserId.has(row.userId)) {
      walletByUserId.set(row.userId, row);
    }
  }

  const connectionByUserId = new Map<string, (typeof walletConnectionRows)[number]>();
  for (const row of walletConnectionRows) {
    if (!connectionByUserId.has(row.userId)) {
      connectionByUserId.set(row.userId, row);
    }
  }

  const documentsByCaseId = new Map<string, AdminKybCase["documents"]>();
  for (const row of documents) {
    const current = documentsByCaseId.get(row.kybCaseId) ?? [];
    current.push({
      id: row.id,
      label: row.documentType,
      category: row.category,
      status: row.status,
      required: row.required,
      uploadedAt: row.latestUploadedAt ? toIso(row.latestUploadedAt) : undefined,
      note: row.note ?? undefined,
    });
    documentsByCaseId.set(row.kybCaseId, current);
  }

  const historyByCaseId = new Map<string, AdminKybCase["history"]>();
  for (const row of events) {
    const current = historyByCaseId.get(row.kybCaseId) ?? [];
    current.push({
      label: row.label,
      timestamp: toIso(row.occurredAt),
      status: row.status,
      actor: row.actorLabel ?? undefined,
      note: row.note ?? undefined,
    });
    historyByCaseId.set(row.kybCaseId, current);
  }

  return customerUsers.map((user) => {
    const caseRow = latestCaseByUserId.get(user.id);
    const reviewer = caseRow?.reviewerUserId
      ? userMap.get(caseRow.reviewerUserId)
      : undefined;
    const bank = bankByUserId.get(user.id);
    const bankAccounts = bankAccountsByUserId.get(user.id) ?? [];
    const wallet = walletByUserId.get(user.id);
    const connection = connectionByUserId.get(user.id);

    return {
      customerId: caseRow?.caseRef ?? user.id,
      customerName: user.name ?? "Unknown Customer",
      contactEmail: user.email ?? "-",
      country: bank?.country ?? "-",
      registrationDate: toIso(user.createdAt),
      submittedAt: toIso(caseRow?.submittedAt ?? user.createdAt),
      status: caseRow?.status ?? "not_started",
      reviewer: reviewer?.name ?? "Unassigned",
      riskLevel: caseRow?.riskLevel ?? "low",
      bankDetails: {
        bankAccountId: bank?.id,
        bankName: bank?.bankName ?? "-",
        accountName: bank?.accountHolder ?? "-",
        ibanMasked: bank?.ibanMasked ?? "-",
        swiftCode: bank?.swiftCode ?? "-",
        status: bank?.status ?? "inactive",
        addedAt: bank?.createdAt ? toIso(bank.createdAt) : undefined,
      },
      bankAccounts,
      walletDetails: {
        network: wallet?.network ?? connection?.primaryNetwork ?? "-",
        walletAddress: wallet?.address ?? "-",
        walletProvider: connection?.provider ?? "-",
      },
      documents: caseRow ? (documentsByCaseId.get(caseRow.id) ?? []) : [],
      notes: caseRow?.notes ?? "",
      history: caseRow ? (historyByCaseId.get(caseRow.id) ?? []) : [],
    };
  });
}

export const DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS = {
  caseNotFound: "ADMIN_KYB_CASE_NOT_FOUND",
} as const;

export const DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS = {
  documentNotFound: "ADMIN_KYB_DOCUMENT_NOT_FOUND",
  submissionNotFound: "ADMIN_KYB_DOCUMENT_SUBMISSION_NOT_FOUND",
} as const;

export const DASHBOARD_ADMIN_BANK_ACCOUNT_DOMAIN_ERRORS = {
  bankAccountNotFound: "ADMIN_BANK_ACCOUNT_NOT_FOUND",
} as const;

function toKybStatusLabel(
  status:
    | "in_progress"
    | "under_review"
    | "approved"
    | "rejected"
    | "needs_update"
    | "blocked",
) {
  if (status === "in_progress") {
    return "Review started";
  }
  if (status === "under_review") {
    return "Moved to review";
  }
  if (status === "approved") {
    return "Case approved";
  }
  if (status === "rejected") {
    return "Case rejected";
  }
  if (status === "needs_update") {
    return "Update requested";
  }
  return "Case blocked";
}

function toKybDocumentStatusLabel(
  status: "under_review" | "approved" | "rejected" | "needs_update",
  documentType: string,
) {
  if (status === "under_review") {
    return `Document moved to review: ${documentType}`;
  }
  if (status === "approved") {
    return `Document approved: ${documentType}`;
  }
  if (status === "rejected") {
    return `Document rejected: ${documentType}`;
  }
  return `Document update requested: ${documentType}`;
}

function deriveCaseStatusFromDocuments(
  documents: { required: boolean; status: string }[],
): "in_progress" | "under_review" | "approved" | "rejected" | "needs_update" {
  const requiredDocuments = documents.filter((row) => row.required);
  if (requiredDocuments.length === 0) {
    return "under_review";
  }

  const allRequiredApproved = requiredDocuments.every(
    (row) => row.status === "approved",
  );
  if (allRequiredApproved) {
    return "approved";
  }

  if (requiredDocuments.some((row) => row.status === "rejected")) {
    return "rejected";
  }
  if (requiredDocuments.some((row) => row.status === "needs_update")) {
    return "needs_update";
  }
  if (requiredDocuments.some((row) => row.status === "under_review")) {
    return "under_review";
  }

  return "in_progress";
}

const DEFAULT_KYB_DOCUMENTS = [
  {
    documentType: "Certificate of incorporation",
    category: "business" as const,
    required: true,
  },
  {
    documentType: "Articles of association",
    category: "business" as const,
    required: true,
  },
  {
    documentType: "Proof of address",
    category: "address" as const,
    required: true,
  },
  {
    documentType: "Identity documents of ubo",
    category: "identity" as const,
    required: true,
  },
  {
    documentType: "Shareholder register",
    category: "business" as const,
    required: true,
  },
];

function buildKybCaseRef(userId: string, now: Date) {
  const timestamp = now.getTime().toString(36).toUpperCase();
  const userSuffix = userId.slice(0, 6).toUpperCase();
  const nonce = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `KYB-${timestamp}-${userSuffix}-${nonce}`;
}

export async function updateAdminKybCaseStatus(
  actorUserId: string,
  caseRef: string,
  input: {
    status:
      | "in_progress"
      | "under_review"
      | "approved"
      | "rejected"
      | "needs_update"
      | "blocked";
    note?: string;
  },
) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(kybCasesTable)
      .where(eq(kybCasesTable.caseRef, caseRef))
      .limit(1);

    let existing = rows[0];
    if (!existing) {
      const targetUsers = await tx
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.id, caseRef), isNull(userTable.deletedAt)))
        .limit(1);

      const targetUser = targetUsers[0];
      if (!targetUser) {
        throw new Error(DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS.caseNotFound);
      }

      const [createdCase] = await tx
        .insert(kybCasesTable)
        .values({
          caseRef: buildKybCaseRef(targetUser.id, now),
          userId: targetUser.id,
          status: "not_started",
          riskLevel: "low",
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!createdCase) {
        throw new Error(DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS.caseNotFound);
      }

      await tx.insert(kybCaseDocumentsTable).values(
        DEFAULT_KYB_DOCUMENTS.map((document) => ({
          kybCaseId: createdCase.id,
          documentType: document.documentType,
          category: document.category,
          required: document.required,
          createdAt: now,
          updatedAt: now,
        })),
      );

      await tx.insert(kybCaseEventsTable).values({
        kybCaseId: createdCase.id,
        label: "Case opened",
        status: "not_started",
        actorUserId,
        actorLabel: "Compliance",
        note: null,
        occurredAt: now,
        createdAt: now,
      });

      existing = createdCase;
    }

    const [updated] = await tx
      .update(kybCasesTable)
      .set({
        status: input.status,
        reviewedAt:
          input.status === "approved" || input.status === "rejected"
            ? now
            : null,
        reviewerUserId: actorUserId,
        notes: input.note ?? existing.notes,
        updatedAt: now,
      })
      .where(eq(kybCasesTable.id, existing.id))
      .returning();

    await tx.insert(kybCaseEventsTable).values({
      kybCaseId: existing.id,
      label: toKybStatusLabel(input.status),
      status: input.status,
      actorUserId,
      actorLabel: "Compliance",
      note: input.note ?? null,
      occurredAt: now,
      createdAt: now,
    });

    return updated;
  });
}

export async function getAdminKybDocumentFile(
  caseRef: string,
  documentId: string,
) {
  const [targetCase] = await db
    .select({
      id: kybCasesTable.id,
    })
    .from(kybCasesTable)
    .where(eq(kybCasesTable.caseRef, caseRef))
    .limit(1);

  if (!targetCase) {
    throw new Error(DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS.caseNotFound);
  }

  const [targetDocument] = await db
    .select({
      id: kybCaseDocumentsTable.id,
    })
    .from(kybCaseDocumentsTable)
    .where(
      and(
        eq(kybCaseDocumentsTable.kybCaseId, targetCase.id),
        eq(kybCaseDocumentsTable.id, documentId),
      ),
    )
    .limit(1);

  if (!targetDocument) {
    throw new Error(DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.documentNotFound);
  }

  const [latestSubmission] = await db
    .select({
      storageUri: kybDocumentSubmissionsTable.storageUri,
    })
    .from(kybDocumentSubmissionsTable)
    .where(
      and(
        eq(kybDocumentSubmissionsTable.kybCaseDocumentId, targetDocument.id),
        isNotNull(kybDocumentSubmissionsTable.storageUri),
      ),
    )
    .orderBy(desc(kybDocumentSubmissionsTable.version))
    .limit(1);

  if (!latestSubmission?.storageUri) {
    throw new Error(DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.submissionNotFound);
  }

  try {
    return await readKybPdfFile(latestSubmission.storageUri);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === KYB_FILE_STORAGE_ERRORS.fileNotFound
    ) {
      throw new Error(DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.submissionNotFound);
    }
    throw error;
  }
}

export async function updateAdminKybDocumentStatus(
  actorUserId: string,
  caseRef: string,
  documentId: string,
  input: {
    status: "under_review" | "approved" | "rejected" | "needs_update";
    note?: string;
  },
) {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [targetCase] = await tx
      .select({
        id: kybCasesTable.id,
        notes: kybCasesTable.notes,
      })
      .from(kybCasesTable)
      .where(eq(kybCasesTable.caseRef, caseRef))
      .limit(1);

    if (!targetCase) {
      throw new Error(DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS.caseNotFound);
    }

    const [targetDocument] = await tx
      .select({
        id: kybCaseDocumentsTable.id,
        documentType: kybCaseDocumentsTable.documentType,
        note: kybCaseDocumentsTable.note,
      })
      .from(kybCaseDocumentsTable)
      .where(
        and(
          eq(kybCaseDocumentsTable.kybCaseId, targetCase.id),
          eq(kybCaseDocumentsTable.id, documentId),
        ),
      )
      .limit(1);

    if (!targetDocument) {
      throw new Error(
        DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.documentNotFound,
      );
    }

    const [latestSubmission] = await tx
      .select({
        id: kybDocumentSubmissionsTable.id,
        reviewerNote: kybDocumentSubmissionsTable.reviewerNote,
      })
      .from(kybDocumentSubmissionsTable)
      .where(eq(kybDocumentSubmissionsTable.kybCaseDocumentId, targetDocument.id))
      .orderBy(desc(kybDocumentSubmissionsTable.version))
      .limit(1);

    if (!latestSubmission) {
      throw new Error(
        DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.submissionNotFound,
      );
    }

    await tx
      .update(kybDocumentSubmissionsTable)
      .set({
        status: input.status,
        reviewedAt: input.status === "under_review" ? null : now,
        reviewerUserId: actorUserId,
        reviewerNote: input.note ?? latestSubmission.reviewerNote,
        updatedAt: now,
      })
      .where(eq(kybDocumentSubmissionsTable.id, latestSubmission.id));

    const [updatedDocument] = await tx
      .update(kybCaseDocumentsTable)
      .set({
        status: input.status,
        note: input.note ?? targetDocument.note,
        updatedAt: now,
      })
      .where(eq(kybCaseDocumentsTable.id, targetDocument.id))
      .returning({
        id: kybCaseDocumentsTable.id,
        status: kybCaseDocumentsTable.status,
      });

    const caseDocuments = await tx
      .select({
        required: kybCaseDocumentsTable.required,
        status: kybCaseDocumentsTable.status,
      })
      .from(kybCaseDocumentsTable)
      .where(eq(kybCaseDocumentsTable.kybCaseId, targetCase.id));

    const derivedCaseStatus = deriveCaseStatusFromDocuments(caseDocuments);

    const [updatedCase] = await tx
      .update(kybCasesTable)
      .set({
        status: derivedCaseStatus,
        reviewedAt:
          derivedCaseStatus === "approved" || derivedCaseStatus === "rejected"
            ? now
            : null,
        reviewerUserId: actorUserId,
        notes: input.note ?? targetCase.notes,
        updatedAt: now,
      })
      .where(eq(kybCasesTable.id, targetCase.id))
      .returning({
        status: kybCasesTable.status,
      });

    await tx.insert(kybCaseEventsTable).values({
      kybCaseId: targetCase.id,
      label: toKybDocumentStatusLabel(input.status, targetDocument.documentType),
      status: derivedCaseStatus,
      actorUserId,
      actorLabel: "Compliance",
      note: input.note ?? null,
      occurredAt: now,
      createdAt: now,
    });

    return {
      documentId: updatedDocument?.id ?? targetDocument.id,
      status: updatedDocument?.status ?? input.status,
      caseStatus: updatedCase?.status ?? derivedCaseStatus,
    };
  });
}

export async function updateAdminBankAccountStatus(
  _actorUserId: string,
  bankAccountId: string,
  input: {
    status: "pending" | "under_review" | "verified" | "rejected" | "inactive";
    note?: string;
  },
) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.id, bankAccountId))
      .limit(1);

    if (!existing) {
      throw new Error(
        DASHBOARD_ADMIN_BANK_ACCOUNT_DOMAIN_ERRORS.bankAccountNotFound,
      );
    }

    const [updated] = await tx
      .update(bankAccountsTable)
      .set({
        status: input.status,
        updatedAt: now,
      })
      .where(eq(bankAccountsTable.id, existing.id))
      .returning();

    return updated;
  });
}

export type AdminReserveManagementState = {
  snapshots: {
    snapshotId: string;
    timestamp: string;
    reserves: number;
    liabilities: number;
    coverageRatio: number;
    variance: number;
    status: string;
    feedFreshness: string;
    notes?: string;
    allocations: {
      bucket: string;
      amount: number;
      share: number;
    }[];
    timeline: {
      label: string;
      timestamp: string;
      status: string;
      actor?: string;
      note?: string;
    }[];
  }[];
  liquidReserves: number;
};

export async function getAdminReserveManagementState(): Promise<AdminReserveManagementState> {
  let snapshotRows = await db
    .select()
    .from(reserveSnapshotsTable)
    .where(eq(reserveSnapshotsTable.snapshotScope, "treasury"))
    .orderBy(asc(reserveSnapshotsTable.snapshotAt))
    .limit(200);

  if (snapshotRows.length === 0) {
    snapshotRows = await db
      .select()
      .from(reserveSnapshotsTable)
      .where(eq(reserveSnapshotsTable.snapshotScope, "public"))
      .orderBy(asc(reserveSnapshotsTable.snapshotAt))
      .limit(200);
  }

  if (snapshotRows.length === 0) {
    return {
      snapshots: [],
      liquidReserves: 0,
    };
  }

  const snapshotIds = snapshotRows.map((row) => row.id);
  const [allocations, events] = await Promise.all([
    db
      .select()
      .from(reserveSnapshotAllocationsTable)
      .where(inArray(reserveSnapshotAllocationsTable.reserveSnapshotId, snapshotIds))
      .orderBy(asc(reserveSnapshotAllocationsTable.createdAt)),
    db
      .select()
      .from(reserveSnapshotEventsTable)
      .where(inArray(reserveSnapshotEventsTable.reserveSnapshotId, snapshotIds))
      .orderBy(desc(reserveSnapshotEventsTable.occurredAt)),
  ]);

  const allocationsBySnapshotId = new Map<
    string,
    AdminReserveManagementState["snapshots"][number]["allocations"]
  >();
  for (const row of allocations) {
    const current = allocationsBySnapshotId.get(row.reserveSnapshotId) ?? [];
    current.push({
      bucket: row.bucket,
      amount: toNumber(row.amount),
      share: toNumber(row.sharePercent),
    });
    allocationsBySnapshotId.set(row.reserveSnapshotId, current);
  }

  const timelineBySnapshotId = new Map<
    string,
    AdminReserveManagementState["snapshots"][number]["timeline"]
  >();
  for (const row of events) {
    const current = timelineBySnapshotId.get(row.reserveSnapshotId) ?? [];
    current.push({
      label: row.label,
      timestamp: toIso(row.occurredAt),
      status: row.status,
      actor: row.actorLabel ?? undefined,
      note: row.note ?? undefined,
    });
    timelineBySnapshotId.set(row.reserveSnapshotId, current);
  }

  const snapshots = snapshotRows.map((row) => ({
    snapshotId: row.snapshotRef ?? row.id,
    timestamp: toIso(row.snapshotAt),
    reserves: toNumber(row.reservesAmount),
    liabilities: toNumber(row.liabilitiesAmount),
    coverageRatio: toNumber(row.coverageRatio),
    variance: toNumber(row.varianceAmount),
    status: row.status,
    feedFreshness: row.feedFreshness,
    notes: row.notes ?? undefined,
    allocations: allocationsBySnapshotId.get(row.id) ?? [],
    timeline: timelineBySnapshotId.get(row.id) ?? [],
  }));

  const latestSnapshot = snapshots[snapshots.length - 1];
  if (!latestSnapshot) {
    return {
      snapshots,
      liquidReserves: 0,
    };
  }

  const liquidReserves =
    latestSnapshot.allocations
      .filter((allocation) =>
        allocation.bucket.toLowerCase().includes("cash"),
      )
      .reduce((sum, allocation) => sum + allocation.amount, 0) ||
    latestSnapshot.reserves;

  return {
    snapshots,
    liquidReserves,
  };
}

export type AdminWalletState = {
  wallets: {
    id: string;
    wallet: string;
    type: "minting_vault" | "treasury_vault" | "redemption_tracking";
    ownerName: string;
    ownerEmail: string;
    balance: number;
    status: string;
    network: string;
    address: string;
    updatedAt: string;
  }[];
  mintAdminWalletLogs: {
    id: string;
    requestId: string;
    customer: string;
    amount: number;
    destinationWallet: string;
    adminWalletAddress: string;
    txHash: string;
    status: string;
    updatedAt: string;
  }[];
  activity: {
    id: string;
    action: string;
    wallet: string;
    customerName: string;
    customerEmail: string;
    actorName: string;
    actorEmail: string;
    status: string;
    timestamp: string;
  }[];
};

function mapAdminWalletType(type: string) {
  if (type === "treasury") {
    return "treasury_vault" as const;
  }
  if (type === "withdrawal") {
    return "redemption_tracking" as const;
  }
  return "minting_vault" as const;
}

const TX_HASH_NOTE_REGEX = /Tx:\s*(0x[a-fA-F0-9]{64})/;
const ADMIN_WALLET_NOTE_REGEX = /Admin wallet:\s*(0x[a-fA-F0-9]{40})/i;

function extractTxHashFromExecutionNote(note: string | null | undefined) {
  if (!note) {
    return null;
  }
  return note.match(TX_HASH_NOTE_REGEX)?.[1] ?? null;
}

function extractAdminWalletFromExecutionNote(note: string | null | undefined) {
  if (!note) {
    return null;
  }
  return note.match(ADMIN_WALLET_NOTE_REGEX)?.[1] ?? null;
}

export async function getAdminWalletState(): Promise<AdminWalletState> {
  const [walletRows, walletEvents, mintRows, mintCompletionEvents] =
    await Promise.all([
      db
        .select()
        .from(managedWalletAddressesTable)
        .orderBy(desc(managedWalletAddressesTable.addedAt))
        .limit(300),
      db
        .select()
        .from(walletActivityEventsTable)
        .orderBy(desc(walletActivityEventsTable.occurredAt))
        .limit(300),
      db
        .select({
          id: mintRequestsTable.id,
          requestRef: mintRequestsTable.requestRef,
          userId: mintRequestsTable.userId,
          amount: mintRequestsTable.amount,
          destinationAddressRaw: mintRequestsTable.destinationAddressRaw,
          destinationWalletAddressId: mintRequestsTable.destinationWalletAddressId,
          status: mintRequestsTable.status,
          updatedAt: mintRequestsTable.updatedAt,
        })
        .from(mintRequestsTable)
        .orderBy(desc(mintRequestsTable.updatedAt))
        .limit(300),
      db
        .select({
          mintRequestId: requestEventsTable.mintRequestId,
          note: requestEventsTable.note,
          occurredAt: requestEventsTable.occurredAt,
        })
        .from(requestEventsTable)
        .where(
          and(
            eq(requestEventsTable.requestType, "mint"),
            eq(requestEventsTable.status, "completed"),
            isNotNull(requestEventsTable.mintRequestId),
          ),
        )
        .orderBy(desc(requestEventsTable.occurredAt))
        .limit(600),
    ]);

  const adminUsers = (await listUsersWithRoles(1000)).filter((user) =>
    hasAdminRole(user.roles),
  );
  const adminById = new Map(
    adminUsers.map((user) => [
      user.id,
      {
        name: user.name ?? user.email ?? "Unknown Admin",
        email: user.email ?? "-",
      },
    ]),
  );

  const relatedUserIds = Array.from(
    new Set([
      ...walletRows.map((row) => row.userId),
      ...walletEvents.map((row) => row.userId),
      ...walletEvents
        .map((row) => row.actorUserId)
        .filter((value): value is string => Boolean(value)),
      ...mintRows.map((row) => row.userId),
    ]),
  );
  const userMap = await getUserProfileMap(relatedUserIds);

  const wallets = walletRows.map((row) => {
    const owner = userMap.get(row.userId);
    return {
      id: row.id,
      wallet: row.label,
      type: mapAdminWalletType(row.type),
      ownerName: owner?.name ?? "Unknown User",
      ownerEmail: owner?.email ?? "-",
      balance: toNumber(row.balance),
      status: row.connectionStatus,
      network: row.network,
      address: row.address,
      updatedAt: toIso(row.lastActivityAt ?? row.updatedAt),
    };
  });

  const walletLabelById = new Map(wallets.map((row) => [row.id, row.wallet]));
  const walletAddressById = new Map(walletRows.map((row) => [row.id, row.address]));

  const latestCompletionEventByMintId = new Map<
    string,
    { note: string | null; occurredAt: string | Date }
  >();
  for (const row of mintCompletionEvents) {
    if (!row.mintRequestId || latestCompletionEventByMintId.has(row.mintRequestId)) {
      continue;
    }
    latestCompletionEventByMintId.set(row.mintRequestId, {
      note: row.note ?? null,
      occurredAt: row.occurredAt,
    });
  }

  const mintAdminWalletLogs = mintRows
    .filter((row) => row.status === "completed")
    .map((row) => {
      const owner = userMap.get(row.userId);
      const completionEvent = latestCompletionEventByMintId.get(row.id);
      const note = completionEvent?.note;
      const destinationWallet =
        row.destinationAddressRaw ??
        (row.destinationWalletAddressId
          ? walletAddressById.get(row.destinationWalletAddressId)
          : undefined) ??
        "-";

      return {
        id: row.id,
        requestId: row.requestRef,
        customer: owner?.name ?? owner?.email ?? "Unknown User",
        amount: toNumber(row.amount),
        destinationWallet,
        adminWalletAddress: extractAdminWalletFromExecutionNote(note) ?? "-",
        txHash: extractTxHashFromExecutionNote(note) ?? "-",
        status: row.status,
        updatedAt: toIso(completionEvent?.occurredAt ?? row.updatedAt),
      };
    });

  const activity = walletEvents.map((row) => {
    const customer = userMap.get(row.userId);
    const adminActor = row.actorUserId ? adminById.get(row.actorUserId) : undefined;
    return {
      id: row.id,
      action: row.action,
      wallet:
        (row.walletAddressId ? walletLabelById.get(row.walletAddressId) : undefined) ??
        row.target ??
        "Wallet",
      customerName: customer?.name ?? customer?.email ?? "Unknown User",
      customerEmail: customer?.email ?? "-",
      actorName: adminActor?.name ?? "-",
      actorEmail: adminActor?.email ?? "-",
      status: row.status,
      timestamp: toIso(row.occurredAt),
    };
  });

  return {
    wallets,
    mintAdminWalletLogs,
    activity,
  };
}
