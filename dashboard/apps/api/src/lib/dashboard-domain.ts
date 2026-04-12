import {
  alertsTable,
  bankAccountsTable,
  kybCaseDocumentsTable,
  kybCaseEventsTable,
  kybCasesTable,
  kybDocumentSubmissionsTable,
  managedWalletAddressTagsTable,
  managedWalletAddressesTable,
  mintRequestsTable,
  redeemRequestsTable,
  requestEventsTable,
  requestOperationsTable,
  reserveSnapshotsTable,
  sessionTable,
  sessionMetadataTable,
  userDashboardPreferencesTable,
  userNotificationsTable,
  userNotificationPreferencesTable,
  userProfileSettingsTable,
  userTable,
  walletActivityEventsTable,
  walletConnectionsTable,
} from "@repo/db";
import { and, asc, desc, eq, inArray, isNull, not, or } from "drizzle-orm";

import { db } from "./db";
import { saveKybPdfFile } from "./kyb-file-storage";
import {
  getTokenBalancesOnBscTestnet,
  isAddressLike,
  toChecksumAddress,
  verifyMintApprovalTx,
  verifyRedeemApprovalTx,
} from "./token-contract";

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

function createRequestRef(prefix: "MNT" | "RDM") {
  const now = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `${prefix}-${now}${random}`;
}

function createWalletRef() {
  const now = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `WAL-${now}${random}`;
}

function requireInserted<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }
  return row;
}

async function insertUserNotification(input: {
  userId: string;
  category: "mint" | "redeem" | "kyb" | "wallet" | "bank_account" | "system";
  title: string;
  message: string;
  status:
    | "active"
    | "connected"
    | "pending"
    | "under_review"
    | "approved"
    | "verified"
    | "rejected"
    | "completed"
    | "blocked"
    | "inactive"
    | "warning"
    | "stale"
    | "critical"
    | "draft"
    | "submitted"
    | "queued"
    | "processing"
    | "not_started"
    | "in_progress"
    | "needs_update";
  entityType?: string;
  entityRef?: string;
}) {
  const now = new Date();
  await db.insert(userNotificationsTable).values({
    userId: input.userId,
    category: input.category,
    title: input.title,
    message: input.message,
    channel: "in_app",
    eventStatus: input.status,
    entityType: input.entityType ?? null,
    entityRef: input.entityRef ?? null,
    isRead: false,
    readAt: null,
    createdAt: now,
    updatedAt: now,
  });
}

function isMintOpenStatus(status: string) {
  return (
    status === "submitted" || status === "under_review" || status === "approved"
  );
}

function isRedeemOpenStatus(status: string) {
  return (
    status === "submitted" ||
    status === "queued" ||
    status === "processing" ||
    status === "approved"
  );
}

function normalizeWalletAddress(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWalletProvider(value: string) {
  return value.trim().toLowerCase();
}

function normalizeWalletNetwork(value: string) {
  return value.trim();
}

function isBscTestnetNetwork(value: string | null | undefined) {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("bsc") ||
    normalized.includes("bnb") ||
    normalized.includes("binance") ||
    normalized.includes("chain 97") ||
    normalized.includes("97")
  );
}

function isWalletReconnectRestrictedStatus(status: string | null | undefined) {
  return status === "rejected" || status === "inactive";
}

function isWalletBalanceVisible(input: {
  verificationStatus: string | null | undefined;
  connectionStatus: string | null | undefined;
}) {
  if (input.connectionStatus !== "connected") {
    return false;
  }
  return !isWalletReconnectRestrictedStatus(input.verificationStatus);
}

export const DASHBOARD_WALLET_DOMAIN_ERRORS = {
  connectionOwnershipConflict: "WALLET_CONNECTION_OWNERSHIP_CONFLICT",
  addressOwnershipConflict: "WALLET_ADDRESS_OWNERSHIP_CONFLICT",
  addressNotFound: "WALLET_ADDRESS_NOT_FOUND",
  addressReconnectRestricted: "WALLET_ADDRESS_RECONNECT_RESTRICTED",
  invalidConnectInput: "WALLET_INVALID_CONNECT_INPUT",
  invalidDisconnectInput: "WALLET_INVALID_DISCONNECT_INPUT",
  invalidPrimarySelectionInput: "WALLET_INVALID_PRIMARY_SELECTION_INPUT",
} as const;

export const DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS = {
  mintRequestNotFound: "MINT_REQUEST_NOT_FOUND",
  redeemRequestNotFound: "REDEEM_REQUEST_NOT_FOUND",
  requestAlreadyCompleted: "REQUEST_ALREADY_COMPLETED",
  mintDestinationWalletMissing: "MINT_DESTINATION_WALLET_MISSING",
  redeemSourceWalletMissing: "REDEEM_SOURCE_WALLET_MISSING",
  onchainExecutionFailed: "ONCHAIN_EXECUTION_FAILED",
} as const;

export const DASHBOARD_KYB_DOCUMENT_DOMAIN_ERRORS = {
  documentNotFound: "KYB_DOCUMENT_NOT_FOUND",
  invalidUpload: "KYB_DOCUMENT_INVALID_UPLOAD",
} as const;

export const DASHBOARD_REQUEST_CREATION_DOMAIN_ERRORS = {
  kybNotVerified: "REQUEST_CREATION_KYB_NOT_VERIFIED",
  mintDestinationWalletNotVerified:
    "REQUEST_CREATION_MINT_DESTINATION_WALLET_NOT_VERIFIED",
  redeemBalanceNotPositive: "REQUEST_CREATION_REDEEM_BALANCE_NOT_POSITIVE",
  redeemDestinationBankAccountNotVerified:
    "REQUEST_CREATION_REDEEM_DESTINATION_BANK_ACCOUNT_NOT_VERIFIED",
} as const;

function isKybApproved(status: string | null | undefined) {
  return status === "approved";
}

async function assertKybApprovedForUser(userId: string) {
  const [latestKybCase] = await db
    .select({
      status: kybCasesTable.status,
    })
    .from(kybCasesTable)
    .where(eq(kybCasesTable.userId, userId))
    .orderBy(desc(kybCasesTable.submittedAt))
    .limit(1);

  if (!isKybApproved(latestKybCase?.status)) {
    throw new Error(DASHBOARD_REQUEST_CREATION_DOMAIN_ERRORS.kybNotVerified);
  }
}

async function getRedeemableBalanceForUser(userId: string) {
  const walletAddresses = await db
    .select({
      address: managedWalletAddressesTable.address,
      network: managedWalletAddressesTable.network,
      type: managedWalletAddressesTable.type,
      verificationStatus: managedWalletAddressesTable.verificationStatus,
      connectionStatus: managedWalletAddressesTable.connectionStatus,
      balance: managedWalletAddressesTable.balance,
    })
    .from(managedWalletAddressesTable)
    .where(eq(managedWalletAddressesTable.userId, userId));

  const primaryWallet = walletAddresses.find(
    (row) =>
      row.type === "primary" &&
      row.connectionStatus === "connected" &&
      row.verificationStatus === "verified",
  );

  if (!primaryWallet) {
    return 0;
  }

  const fallbackBalance = toNumber(primaryWallet.balance);
  if (
    !isBscTestnetNetwork(primaryWallet.network) ||
    !isAddressLike(primaryWallet.address)
  ) {
    return fallbackBalance;
  }

  const liveBalances = await getTokenBalancesOnBscTestnet([
    primaryWallet.address,
  ]).catch((error) => {
    console.warn("[dashboard] primary live BSC token balance fetch failed", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  });

  const normalizedAddress = toChecksumAddress(primaryWallet.address).toLowerCase();
  const liveBalance = liveBalances?.get(normalizedAddress);

  return typeof liveBalance === "number" ? liveBalance : fallbackBalance;
}

async function hasVerifiedDestinationBankAccount(
  userId: string,
  destination: string,
) {
  const [account] = await db
    .select({ id: bankAccountsTable.id })
    .from(bankAccountsTable)
    .where(
      and(
        eq(bankAccountsTable.userId, userId),
        eq(bankAccountsTable.ibanMasked, destination),
        eq(bankAccountsTable.status, "verified"),
      ),
    )
    .limit(1);

  return Boolean(account?.id);
}

async function hasVerifiedConnectedWalletAddress(
  userId: string,
  destinationAddress: string,
) {
  const normalizedDestination = normalizeWalletAddress(destinationAddress);
  if (!normalizedDestination) {
    return false;
  }

  const [address] = await db
    .select({ id: managedWalletAddressesTable.id })
    .from(managedWalletAddressesTable)
    .where(
      and(
        eq(managedWalletAddressesTable.userId, userId),
        eq(managedWalletAddressesTable.address, normalizedDestination),
        eq(managedWalletAddressesTable.connectionStatus, "connected"),
        eq(managedWalletAddressesTable.verificationStatus, "verified"),
      ),
    )
    .limit(1);

  return Boolean(address?.id);
}

async function getUserNameMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const rows = await db
    .select({
      id: userTable.id,
      name: userTable.name,
    })
    .from(userTable)
    .where(and(inArray(userTable.id, userIds), isNull(userTable.deletedAt)));

  return new Map(rows.map((row) => [row.id, row.name]));
}

export type DashboardState = {
  overviewCards: {
    holdings: number;
    pendingRequests: number;
    kybStatus: string;
    reserveCoverage: number;
    latestActivityAt: string;
    blockers: number;
  };
  overviewActivities: {
    id: string;
    type: "mint" | "redeem" | "kyb";
    requestId: string;
    date: string;
    amount?: number;
    status: string;
  }[];
  mintRequests: {
    requestId: string;
    submittedAt: string;
    amount: number;
    paymentRef: string;
    destination: string;
    status: string;
    updatedAt: string;
    timeline: {
      label: string;
      timestamp: string;
      status: string;
      actor?: string;
      note?: string;
    }[];
  }[];
  redeemRequests: {
    requestId: string;
    createdAt: string;
    amount: number;
    destination: string;
    payoutRail: "bank" | "swift" | "crypto";
    queuePos: number;
    status: string;
    updatedAt: string;
    timeline: {
      label: string;
      timestamp: string;
      status: string;
      actor?: string;
      note?: string;
    }[];
  }[];
  redemptionOpsQueue: {
    requestId: string;
    user: string;
    amount: number;
    submittedAt: string;
    destinationAccount?: string;
    onchainWalletAddress?: string;
    status: string;
    assignee: string;
    riskFlag?: string;
    kybState?: string;
    queuePos?: number;
    sla?: string;
    timeline: {
      label: string;
      timestamp: string;
      status: string;
      actor?: string;
      note?: string;
    }[];
  }[];
  kybChecklist: {
    id: string;
    label: string;
    category: "identity" | "address" | "source_of_funds" | "business";
    status: string;
    required: boolean;
    uploadedAt?: string;
    note?: string;
  }[];
  kybSubmissions: {
    caseId: string;
    docType: string;
    submittedAt: string;
    reviewedAt?: string;
    version: number;
    status: string;
    reviewerNote?: string;
  }[];
  reserveSnapshots: {
    timestamp: string;
    reserves: number;
    supply: number;
    coverageRatio: number;
    syncStatus: string;
  }[];
  reserveAlerts: {
    id: string;
    type: string;
    severity: string;
    source: string;
    createdAt: string;
    status: string;
    owner: string;
    message: string;
  }[];
  bankAccounts: {
    id: string;
    accountHolder: string;
    bankName: string;
    ibanMasked: string;
    accountNumberMasked: string;
    bankAddress: string;
    swiftCode: string;
    country: string;
    currency: string;
    status: string;
    isPrimary: boolean;
    addedAt: string;
  }[];
  walletConnectionSummary: {
    provider: string;
    accountId: string;
    primaryNetwork: string;
    connectedSince: string;
    status: string;
    dailyTransferLimit: number;
    usedToday: number;
    policyProfile: string;
  };
  walletAddresses: {
    id: string;
    label: string;
    address: string;
    network: string;
    type: "primary" | "secondary" | "treasury" | "withdrawal";
    balance: number;
    allocation: number;
    verificationStatus: string;
    connectionStatus: string;
    addedAt: string;
    lastActivityAt?: string;
    tags: string[];
    timeline: {
      label: string;
      timestamp: string;
      status: string;
      actor?: string;
      note?: string;
    }[];
  }[];
  walletActivity: {
    id: string;
    action: string;
    actor: string;
    target: string;
    network: string;
    status: string;
    timestamp: string;
  }[];
  settingsProfile: {
    fullName: string;
    organization: string;
    email: string;
    contactPhone: string;
    timezone: string;
    baseCurrency: string;
    reportingContact: string;
  };
  settingsNotificationPreferences: {
    id: string;
    label: string;
    description: string;
    channel: "email" | "in_app" | "sms";
    enabled: boolean;
    criticalOnly?: boolean;
  }[];
  settingsSecuritySessions: {
    id: string;
    device: string;
    location: string;
    ipAddress: string;
    lastActiveAt: string;
    current: boolean;
    status: string;
  }[];
  settingsDashboardPreferences: {
    defaultLandingPage: string;
    compactTableDensity: boolean;
    showUsdInMillions: boolean;
    weeklyDigest: boolean;
    documentDelivery: string;
  };
};

function timelineRow(row: {
  label: string;
  status: string;
  occurredAt: Date;
  actorLabel: string | null;
  note: string | null;
}) {
  return {
    label: row.label,
    timestamp: row.occurredAt.toISOString(),
    status: row.status,
    actor: row.actorLabel ?? undefined,
    note: row.note ?? undefined,
  };
}

export async function getDashboardStateForUser(
  userId: string,
): Promise<DashboardState> {
  const [
    mintRows,
    redeemRows,
    latestKybCase,
    publicReserveRows,
    reserveAlertRows,
    walletConnection,
    walletAddressRows,
    walletActivityRows,
    profileRow,
    notificationRows,
    dashboardPrefRow,
    sessionRows,
    bankAccountRows,
  ] = await Promise.all([
    db
      .select()
      .from(mintRequestsTable)
      .where(eq(mintRequestsTable.userId, userId))
      .orderBy(desc(mintRequestsTable.submittedAt)),
    db
      .select()
      .from(redeemRequestsTable)
      .where(eq(redeemRequestsTable.userId, userId))
      .orderBy(desc(redeemRequestsTable.submittedAt)),
    db
      .select()
      .from(kybCasesTable)
      .where(eq(kybCasesTable.userId, userId))
      .orderBy(desc(kybCasesTable.submittedAt))
      .limit(1),
    db
      .select()
      .from(reserveSnapshotsTable)
      .where(eq(reserveSnapshotsTable.snapshotScope, "public"))
      .orderBy(asc(reserveSnapshotsTable.snapshotAt)),
    db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.domain, "reserve"))
      .orderBy(desc(alertsTable.createdAt))
      .limit(10),
    db
      .select()
      .from(walletConnectionsTable)
      .where(eq(walletConnectionsTable.userId, userId))
      .orderBy(
        desc(walletConnectionsTable.updatedAt),
        desc(walletConnectionsTable.createdAt),
      )
      .limit(25),
    db
      .select()
      .from(managedWalletAddressesTable)
      .where(eq(managedWalletAddressesTable.userId, userId))
      .orderBy(desc(managedWalletAddressesTable.addedAt)),
    db
      .select()
      .from(walletActivityEventsTable)
      .where(eq(walletActivityEventsTable.userId, userId))
      .orderBy(desc(walletActivityEventsTable.occurredAt))
      .limit(30),
    db
      .select({
        userName: userTable.name,
        userEmail: userTable.email,
        contactPhone: userProfileSettingsTable.contactPhone,
        timezone: userProfileSettingsTable.timezone,
        baseCurrency: userProfileSettingsTable.baseCurrency,
        reportingContactEmail: userProfileSettingsTable.reportingContactEmail,
      })
      .from(userTable)
      .leftJoin(
        userProfileSettingsTable,
        eq(userProfileSettingsTable.userId, userTable.id),
      )
      .where(and(eq(userTable.id, userId), isNull(userTable.deletedAt)))
      .limit(1),
    db
      .select()
      .from(userNotificationPreferencesTable)
      .where(eq(userNotificationPreferencesTable.userId, userId))
      .orderBy(asc(userNotificationPreferencesTable.preferenceKey)),
    db
      .select()
      .from(userDashboardPreferencesTable)
      .where(eq(userDashboardPreferencesTable.userId, userId))
      .limit(1),
    db
      .select({
        sessionId: sessionTable.id,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
        updatedAt: sessionTable.updatedAt,
        metaDevice: sessionMetadataTable.deviceLabel,
        metaLocation: sessionMetadataTable.locationLabel,
        metaStatus: sessionMetadataTable.riskStatus,
        metaLastActiveAt: sessionMetadataTable.lastActiveAt,
      })
      .from(sessionTable)
      .leftJoin(
        sessionMetadataTable,
        eq(sessionMetadataTable.sessionId, sessionTable.id),
      )
      .where(eq(sessionTable.userId, userId))
      .orderBy(desc(sessionTable.updatedAt))
      .limit(20),
    db
      .select()
      .from(bankAccountsTable)
      .where(eq(bankAccountsTable.userId, userId))
      .orderBy(desc(bankAccountsTable.createdAt)),
  ]);

  const mintIds = mintRows.map((row) => row.id);
  const redeemIds = redeemRows.map((row) => row.id);
  const allTimelineRows =
    mintIds.length + redeemIds.length > 0
      ? await db
          .select({
            mintRequestId: requestEventsTable.mintRequestId,
            redeemRequestId: requestEventsTable.redeemRequestId,
            label: requestEventsTable.label,
            status: requestEventsTable.status,
            occurredAt: requestEventsTable.occurredAt,
            actorLabel: requestEventsTable.actorLabel,
            note: requestEventsTable.note,
          })
          .from(requestEventsTable)
          .where(
            or(
              mintIds.length > 0
                ? inArray(requestEventsTable.mintRequestId, mintIds)
                : undefined,
              redeemIds.length > 0
                ? inArray(requestEventsTable.redeemRequestId, redeemIds)
                : undefined,
            ),
          )
          .orderBy(desc(requestEventsTable.occurredAt))
      : [];

  const mintTimelineMap = new Map<string, ReturnType<typeof timelineRow>[]>();
  const redeemTimelineMap = new Map<string, ReturnType<typeof timelineRow>[]>();

  for (const row of allTimelineRows) {
    const mapped = timelineRow(row);
    if (row.mintRequestId) {
      const key = row.mintRequestId;
      const current = mintTimelineMap.get(key) ?? [];
      current.push(mapped);
      mintTimelineMap.set(key, current);
    }
    if (row.redeemRequestId) {
      const key = row.redeemRequestId;
      const current = redeemTimelineMap.get(key) ?? [];
      current.push(mapped);
      redeemTimelineMap.set(key, current);
    }
  }

  const mintRequests = mintRows.map((row) => ({
    requestId: row.requestRef,
    submittedAt: toIso(row.submittedAt),
    amount: toNumber(row.amount),
    paymentRef: row.paymentReference,
    destination: row.destinationAddressRaw ?? "-",
    status: row.status,
    updatedAt: toIso(row.updatedAt),
    timeline: mintTimelineMap.get(row.id) ?? [],
  }));

  const redeemRequests = redeemRows.map((row) => ({
    requestId: row.requestRef,
    createdAt: toIso(row.submittedAt),
    amount: toNumber(row.amount),
    destination: row.destinationAccountMasked,
    payoutRail: row.payoutRail,
    queuePos: row.queuePosition ?? 0,
    status: row.status,
    updatedAt: toIso(row.updatedAt),
    timeline: redeemTimelineMap.get(row.id) ?? [],
  }));

  const [opsRows, latestCaseEvents, latestCaseDocs] = await Promise.all([
    redeemIds.length > 0
      ? db
          .select({
            redeemRequestId: requestOperationsTable.redeemRequestId,
            assigneeUserId: requestOperationsTable.assigneeUserId,
            queuePosition: requestOperationsTable.queuePosition,
            riskLevel: requestOperationsTable.riskLevel,
            kybState: requestOperationsTable.kybState,
            slaTargetAt: requestOperationsTable.slaTargetAt,
            note: requestOperationsTable.operationalNote,
          })
          .from(requestOperationsTable)
          .where(inArray(requestOperationsTable.redeemRequestId, redeemIds))
      : Promise.resolve([]),
    latestKybCase[0]
      ? db
          .select({
            label: kybCaseEventsTable.label,
            status: kybCaseEventsTable.status,
            occurredAt: kybCaseEventsTable.occurredAt,
            actorLabel: kybCaseEventsTable.actorLabel,
            note: kybCaseEventsTable.note,
          })
          .from(kybCaseEventsTable)
          .where(eq(kybCaseEventsTable.kybCaseId, latestKybCase[0].id))
          .orderBy(desc(kybCaseEventsTable.occurredAt))
      : Promise.resolve([]),
    latestKybCase[0]
      ? db
          .select()
          .from(kybCaseDocumentsTable)
          .where(eq(kybCaseDocumentsTable.kybCaseId, latestKybCase[0].id))
          .orderBy(asc(kybCaseDocumentsTable.createdAt))
      : Promise.resolve([]),
  ]);

  const assigneeIds = opsRows
    .map((row) => row.assigneeUserId)
    .filter((value): value is string => Boolean(value));
  const assigneeMap = await getUserNameMap(Array.from(new Set(assigneeIds)));

  const opsByRedeemRequestId = new Map(
    opsRows.map((row) => [row.redeemRequestId ?? "", row]),
  );

  const redemptionOpsQueue = redeemRows.map((row) => {
    const ops = opsByRedeemRequestId.get(row.id);
    const timeline = redeemTimelineMap.get(row.id) ?? [];
    return {
      requestId: row.requestRef,
      user: profileRow[0]?.userName ?? "Current User",
      amount: toNumber(row.amount),
      submittedAt: toIso(row.submittedAt),
      destinationAccount: row.destinationAccountMasked,
      status: row.status,
      assignee:
        (ops?.assigneeUserId
          ? assigneeMap.get(ops.assigneeUserId)
          : undefined) ?? "Unassigned",
      riskFlag: ops?.riskLevel ?? undefined,
      kybState: ops?.kybState ?? undefined,
      queuePos: ops?.queuePosition ?? row.queuePosition ?? undefined,
      sla: ops?.slaTargetAt ? toIso(ops.slaTargetAt) : undefined,
      timeline,
    };
  });

  const caseId = latestKybCase[0]?.id ?? null;
  const kybSubmissionsRaw = caseId
    ? await db
        .select({
          caseRef: kybCasesTable.caseRef,
          docType: kybCaseDocumentsTable.documentType,
          submittedAt: kybDocumentSubmissionsTable.submittedAt,
          reviewedAt: kybDocumentSubmissionsTable.reviewedAt,
          version: kybDocumentSubmissionsTable.version,
          status: kybDocumentSubmissionsTable.status,
          reviewerNote: kybDocumentSubmissionsTable.reviewerNote,
        })
        .from(kybDocumentSubmissionsTable)
        .innerJoin(
          kybCaseDocumentsTable,
          eq(
            kybCaseDocumentsTable.id,
            kybDocumentSubmissionsTable.kybCaseDocumentId,
          ),
        )
        .innerJoin(
          kybCasesTable,
          eq(kybCasesTable.id, kybCaseDocumentsTable.kybCaseId),
        )
        .where(eq(kybCaseDocumentsTable.kybCaseId, caseId))
        .orderBy(desc(kybDocumentSubmissionsTable.submittedAt))
    : [];

  const kybChecklist = latestCaseDocs.map((row) => ({
    id: row.id,
    label: row.documentType,
    category: row.category,
    status: row.status,
    required: row.required,
    uploadedAt: row.latestUploadedAt ? toIso(row.latestUploadedAt) : undefined,
    note: row.note ?? undefined,
  }));

  const kybSubmissions = kybSubmissionsRaw.map((row) => ({
    caseId: row.caseRef,
    docType: row.docType,
    submittedAt: toIso(row.submittedAt),
    reviewedAt: row.reviewedAt ? toIso(row.reviewedAt) : undefined,
    version: row.version,
    status: row.status,
    reviewerNote: row.reviewerNote ?? undefined,
  }));

  const reserveSnapshots = publicReserveRows.map((row) => ({
    timestamp: toIso(row.snapshotAt),
    reserves: toNumber(row.reservesAmount),
    supply: toNumber(row.liabilitiesAmount),
    coverageRatio: toNumber(row.coverageRatio),
    syncStatus: row.status,
  }));

  const reserveAlerts = reserveAlertRows.map((row) => ({
    id: row.id,
    type: row.type,
    severity: row.severity,
    source: row.source,
    createdAt: toIso(row.createdAt),
    status: row.status,
    owner: row.ownerLabel ?? "Unassigned",
    message: row.message,
  }));

  const bankAccounts = bankAccountRows.map((row) => ({
    id: row.id,
    accountHolder: row.accountHolder,
    bankName: row.bankName,
    ibanMasked: row.ibanMasked,
    accountNumberMasked: row.accountNumberMasked ?? "-",
    bankAddress: row.bankAddress ?? "-",
    swiftCode: row.swiftCode ?? "-",
    country: row.country,
    currency: row.currency,
    status: row.status,
    isPrimary: row.isPrimary,
    addedAt: toIso(row.createdAt),
  }));

  const walletAddressIds = walletAddressRows.map((row) => row.id);
  const [walletTagRows, walletTimelineRows] = await Promise.all([
    walletAddressIds.length > 0
      ? db
          .select()
          .from(managedWalletAddressTagsTable)
          .where(
            inArray(
              managedWalletAddressTagsTable.walletAddressId,
              walletAddressIds,
            ),
          )
      : Promise.resolve([]),
    walletAddressIds.length > 0
      ? db
          .select({
            walletAddressId: walletActivityEventsTable.walletAddressId,
            label: walletActivityEventsTable.action,
            status: walletActivityEventsTable.status,
            occurredAt: walletActivityEventsTable.occurredAt,
            actorLabel: walletActivityEventsTable.actorLabel,
          })
          .from(walletActivityEventsTable)
          .where(
            inArray(
              walletActivityEventsTable.walletAddressId,
              walletAddressIds,
            ),
          )
          .orderBy(desc(walletActivityEventsTable.occurredAt))
      : Promise.resolve([]),
  ]);

  const tagsByWalletId = new Map<string, string[]>();
  for (const row of walletTagRows) {
    const current = tagsByWalletId.get(row.walletAddressId) ?? [];
    current.push(row.tag);
    tagsByWalletId.set(row.walletAddressId, current);
  }

  const walletTimelineByWalletId = new Map<
    string,
    DashboardState["walletAddresses"][number]["timeline"]
  >();
  for (const row of walletTimelineRows) {
    if (!row.walletAddressId) {
      continue;
    }
    const current = walletTimelineByWalletId.get(row.walletAddressId) ?? [];
    current.push({
      label: row.label,
      timestamp: toIso(row.occurredAt),
      status: row.status,
      actor: row.actorLabel ?? undefined,
    });
    walletTimelineByWalletId.set(row.walletAddressId, current);
  }

  const bscWalletAddresses = Array.from(
    new Set(
      walletAddressRows
        .filter(
          (row) =>
            isBscTestnetNetwork(row.network) &&
            isWalletBalanceVisible({
              verificationStatus: row.verificationStatus,
              connectionStatus: row.connectionStatus,
            }),
        )
        .map((row) => row.address),
    ),
  );
  const liveBalancesByAddress = await getTokenBalancesOnBscTestnet(
    bscWalletAddresses,
  ).catch((error) => {
    console.warn("[dashboard] live BSC token balance fetch failed", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  });

  const walletAddresses = walletAddressRows.map((row) => {
    const normalizedAddress = isAddressLike(row.address)
      ? toChecksumAddress(row.address).toLowerCase()
      : "";
    const liveBalance = liveBalancesByAddress?.get(normalizedAddress);
    const effectiveConnectionStatus = isWalletReconnectRestrictedStatus(
      row.verificationStatus,
    )
      ? "inactive"
      : row.connectionStatus;
    const balanceVisible = isWalletBalanceVisible({
      verificationStatus: row.verificationStatus,
      connectionStatus: effectiveConnectionStatus,
    });

    return {
      id: row.id,
      label: row.label,
      address: row.address,
      network: row.network,
      type: row.type,
      balance: balanceVisible
        ? typeof liveBalance === "number"
          ? liveBalance
          : toNumber(row.balance)
        : 0,
      allocation: toNumber(row.allocationPercent),
      verificationStatus: row.verificationStatus,
      connectionStatus: effectiveConnectionStatus,
      addedAt: toIso(row.addedAt),
      lastActivityAt: row.lastActivityAt ? toIso(row.lastActivityAt) : undefined,
      tags: tagsByWalletId.get(row.id) ?? [],
      timeline: walletTimelineByWalletId.get(row.id) ?? [],
    };
  });

  const walletActivity = walletActivityRows.map((row) => ({
    id: row.id,
    action: row.action,
    actor: row.actorLabel ?? "System",
    target: row.target ?? "-",
    network: row.network ?? "-",
    status: row.status,
    timestamp: toIso(row.occurredAt),
  }));

  const settingsProfile = {
    fullName: profileRow[0]?.userName ?? "User",
    organization: "Account",
    email: profileRow[0]?.userEmail ?? "",
    contactPhone: profileRow[0]?.contactPhone ?? "",
    timezone: profileRow[0]?.timezone ?? "UTC",
    baseCurrency: profileRow[0]?.baseCurrency ?? "USD",
    reportingContact: profileRow[0]?.reportingContactEmail ?? "",
  };

  const settingsNotificationPreferences = notificationRows.map((row) => ({
    id: row.id,
    label: row.preferenceKey,
    description: row.preferenceKey,
    channel: row.channel,
    enabled: row.enabled,
    criticalOnly: row.criticalOnly,
  }));

  const settingsDashboardPreferences = {
    defaultLandingPage:
      dashboardPrefRow[0]?.defaultLandingPage ?? "/dashboard/overview",
    compactTableDensity: dashboardPrefRow[0]?.compactTableDensity ?? false,
    showUsdInMillions: dashboardPrefRow[0]?.showUsdInMillions ?? true,
    weeklyDigest: dashboardPrefRow[0]?.weeklyDigest ?? true,
    documentDelivery: dashboardPrefRow[0]?.documentDelivery ?? "email",
  };

  const settingsSecuritySessions = sessionRows.map((row, index) => ({
    id: row.sessionId,
    device: row.metaDevice ?? row.userAgent ?? "Unknown Device",
    location: row.metaLocation ?? "Unknown",
    ipAddress: row.ipAddress ?? "-",
    lastActiveAt: toIso(row.metaLastActiveAt ?? row.updatedAt),
    current: index === 0,
    status: row.metaStatus ?? "active",
  }));

  const latestReserveSnapshot = reserveSnapshots[reserveSnapshots.length - 1];
  const latestActivity = [...mintRequests, ...redeemRequests].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )[0]?.updatedAt;

  const blockedChecklistCount = kybChecklist.filter((entry) =>
    ["not_started", "needs_update", "rejected"].includes(entry.status),
  ).length;

  const holdings = walletAddresses
    .filter(
      (row) =>
        row.connectionStatus === "connected" &&
        row.verificationStatus === "verified",
    )
    .reduce((sum, row) => sum + (row.balance ?? 0), 0);
  const pendingRequests =
    mintRequests.filter((row) => isMintOpenStatus(row.status)).length +
    redeemRequests.filter((row) => isRedeemOpenStatus(row.status)).length;
  const activeConnectionIds = new Set(
    walletAddressRows
      .filter(
        (row) =>
          row.connectionId &&
          row.connectionStatus === "connected" &&
          !isWalletReconnectRestrictedStatus(row.verificationStatus),
      )
      .map((row) => row.connectionId),
  );
  const activeWalletConnection =
    walletConnection.find(
      (row) => row.status === "connected" && activeConnectionIds.has(row.id),
    ) ?? null;

  const overviewActivities: DashboardState["overviewActivities"] = [
    ...mintRequests.slice(0, 8).map((row) => ({
      id: `mint-${row.requestId}`,
      type: "mint" as const,
      requestId: row.requestId,
      date: row.updatedAt,
      amount: row.amount,
      status: row.status,
    })),
    ...redeemRequests.slice(0, 8).map((row) => ({
      id: `redeem-${row.requestId}`,
      type: "redeem" as const,
      requestId: row.requestId,
      date: row.updatedAt,
      amount: row.amount,
      status: row.status,
    })),
    ...latestCaseEvents.slice(0, 4).map((row) => ({
      id: `kyb-${toIso(row.occurredAt)}-${row.status}`,
      type: "kyb" as const,
      requestId: latestKybCase[0]?.caseRef ?? "KYB",
      date: toIso(row.occurredAt),
      status: row.status,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return {
    overviewCards: {
      holdings,
      pendingRequests,
      kybStatus: latestKybCase[0]?.status ?? "not_started",
      reserveCoverage: (latestReserveSnapshot?.coverageRatio ?? 0) * 100,
      latestActivityAt: latestActivity ?? new Date(0).toISOString(),
      blockers: blockedChecklistCount,
    },
    overviewActivities,
    mintRequests,
    redeemRequests,
    redemptionOpsQueue,
    kybChecklist,
    kybSubmissions,
    reserveSnapshots,
    reserveAlerts,
    bankAccounts,
    walletConnectionSummary: activeWalletConnection
      ? {
          provider: activeWalletConnection.provider,
          accountId: activeWalletConnection.providerAccountId,
          primaryNetwork: activeWalletConnection.primaryNetwork,
          connectedSince: toIso(activeWalletConnection.connectedSince),
          status: activeWalletConnection.status,
          dailyTransferLimit: toNumber(activeWalletConnection.dailyTransferLimit),
          usedToday: toNumber(activeWalletConnection.usedToday),
          policyProfile: activeWalletConnection.policyProfile ?? "-",
        }
      : {
          provider: "No provider",
          accountId: "-",
          primaryNetwork: "-",
          connectedSince: toIso(null),
          status: "inactive",
          dailyTransferLimit: 0,
          usedToday: 0,
          policyProfile: "-",
        },
    walletAddresses,
    walletActivity,
    settingsProfile,
    settingsNotificationPreferences,
    settingsSecuritySessions,
    settingsDashboardPreferences,
  };
}

export async function createMintRequestForUser(
  userId: string,
  input: {
    amount: number;
    paymentRef: string;
    destination: string;
    note?: string;
  },
) {
  await assertKybApprovedForUser(userId);
  const destination = input.destination.trim();
  const hasVerifiedDestination = await hasVerifiedConnectedWalletAddress(
    userId,
    destination,
  );
  if (!hasVerifiedDestination) {
    throw new Error(
      DASHBOARD_REQUEST_CREATION_DOMAIN_ERRORS.mintDestinationWalletNotVerified,
    );
  }

  const now = new Date();
  const requestRef = createRequestRef("MNT");
  const [created] = await db
    .insert(mintRequestsTable)
    .values({
      requestRef,
      userId,
      submittedByUserId: userId,
      amount: String(input.amount),
      paymentReference: input.paymentRef,
      destinationAddressRaw: destination,
      status: "submitted",
      submittedAt: now,
    })
    .returning();
  const createdMintRequest = requireInserted(
    created,
    "Failed to create mint request",
  );

  await db.insert(requestEventsTable).values({
    requestType: "mint",
    mintRequestId: createdMintRequest.id,
    label: "Request submitted",
    status: "submitted",
    actorUserId: userId,
    note: input.note ?? null,
    occurredAt: now,
  });

  return createdMintRequest;
}

export async function uploadKybDocumentForUser(
  userId: string,
  input: {
    documentId: string;
    file: File;
  },
) {
  const now = new Date();

  const [targetDocument] = await db
    .select({
      documentId: kybCaseDocumentsTable.id,
      documentType: kybCaseDocumentsTable.documentType,
      caseId: kybCasesTable.id,
      caseRef: kybCasesTable.caseRef,
      userName: userTable.name,
    })
    .from(kybCaseDocumentsTable)
    .innerJoin(kybCasesTable, eq(kybCasesTable.id, kybCaseDocumentsTable.kybCaseId))
    .innerJoin(userTable, eq(userTable.id, kybCasesTable.userId))
    .where(
      and(
        eq(kybCaseDocumentsTable.id, input.documentId),
        eq(kybCasesTable.userId, userId),
      ),
    )
    .limit(1);

  if (!targetDocument) {
    throw new Error(DASHBOARD_KYB_DOCUMENT_DOMAIN_ERRORS.documentNotFound);
  }

  const storedFile = await saveKybPdfFile({
    documentType: targetDocument.documentType,
    userName: targetDocument.userName,
    userId,
    file: input.file,
    now,
  });

  return db.transaction(async (tx) => {
    const [latestSubmission] = await tx
      .select({
        version: kybDocumentSubmissionsTable.version,
      })
      .from(kybDocumentSubmissionsTable)
      .where(eq(kybDocumentSubmissionsTable.kybCaseDocumentId, targetDocument.documentId))
      .orderBy(desc(kybDocumentSubmissionsTable.version))
      .limit(1);

    const nextVersion = (latestSubmission?.version ?? 0) + 1;

    const [createdSubmission] = await tx
      .insert(kybDocumentSubmissionsTable)
      .values({
        kybCaseDocumentId: targetDocument.documentId,
        version: nextVersion,
        submittedAt: now,
        status: "under_review",
        reviewerNote: null,
        reviewedAt: null,
        reviewerUserId: null,
        storageUri: storedFile.storageUri,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: kybDocumentSubmissionsTable.id,
        version: kybDocumentSubmissionsTable.version,
        status: kybDocumentSubmissionsTable.status,
        submittedAt: kybDocumentSubmissionsTable.submittedAt,
      });

    if (!createdSubmission) {
      throw new Error(DASHBOARD_KYB_DOCUMENT_DOMAIN_ERRORS.invalidUpload);
    }

    await tx
      .update(kybCaseDocumentsTable)
      .set({
        status: "under_review",
        latestUploadedAt: now,
        note: null,
        updatedAt: now,
      })
      .where(eq(kybCaseDocumentsTable.id, targetDocument.documentId));

    await tx
      .update(kybCasesTable)
      .set({
        status: "under_review",
        submittedAt: now,
        reviewedAt: null,
        reviewerUserId: null,
        updatedAt: now,
      })
      .where(eq(kybCasesTable.id, targetDocument.caseId));

    await tx.insert(kybCaseEventsTable).values({
      kybCaseId: targetDocument.caseId,
      label: `Document uploaded: ${targetDocument.documentType}`,
      status: "under_review",
      actorUserId: userId,
      actorLabel: "Customer",
      note: null,
      occurredAt: now,
      createdAt: now,
    });

    return {
      submissionId: createdSubmission.id,
      caseRef: targetDocument.caseRef,
      documentId: targetDocument.documentId,
      documentType: targetDocument.documentType,
      version: createdSubmission.version,
      status: createdSubmission.status,
      submittedAt: toIso(createdSubmission.submittedAt),
      fileName: storedFile.fileName,
      storageUri: storedFile.storageUri,
    };
  });
}

export async function createRedeemRequestForUser(
  userId: string,
  input: {
    amount: number;
    destination: string;
    payoutRail: "bank" | "swift" | "crypto";
    note?: string;
  },
) {
  await assertKybApprovedForUser(userId);

  const redeemableBalance = await getRedeemableBalanceForUser(userId);
  if (redeemableBalance <= 0) {
    throw new Error(
      DASHBOARD_REQUEST_CREATION_DOMAIN_ERRORS.redeemBalanceNotPositive,
    );
  }

  const destination = input.destination.trim();
  const hasVerifiedDestination = await hasVerifiedDestinationBankAccount(
    userId,
    destination,
  );
  if (!hasVerifiedDestination) {
    throw new Error(
      DASHBOARD_REQUEST_CREATION_DOMAIN_ERRORS.redeemDestinationBankAccountNotVerified,
    );
  }

  const now = new Date();
  const requestRef = createRequestRef("RDM");
  const [created] = await db
    .insert(redeemRequestsTable)
    .values({
      requestRef,
      userId,
      submittedByUserId: userId,
      amount: String(input.amount),
      destinationAccountMasked: destination,
      payoutRail: input.payoutRail,
      status: "submitted",
      submittedAt: now,
      queuePosition: 0,
    })
    .returning();
  const createdRedeemRequest = requireInserted(
    created,
    "Failed to create redeem request",
  );

  await db.insert(requestEventsTable).values({
    requestType: "redeem",
    redeemRequestId: createdRedeemRequest.id,
    label: "Request submitted",
    status: "submitted",
    actorUserId: userId,
    note: input.note ?? null,
    occurredAt: now,
  });

  await db.insert(requestOperationsTable).values({
    requestType: "redeem",
    redeemRequestId: createdRedeemRequest.id,
    queuePosition: 0,
  });

  return createdRedeemRequest;
}

export async function upsertDashboardSettingsForUser(
  userId: string,
  input: Partial<{
    profile: {
      fullName?: string;
      email?: string;
      contactPhone?: string;
      timezone?: string;
      baseCurrency?: string;
      reportingContact?: string;
    };
    notificationPreferences: {
      id?: string;
      preferenceKey: string;
      channel: "email" | "in_app" | "sms";
      enabled: boolean;
      criticalOnly?: boolean;
    }[];
    dashboardPreferences: {
      defaultLandingPage?: string;
      compactTableDensity?: boolean;
      showUsdInMillions?: boolean;
      weeklyDigest?: boolean;
      documentDelivery?: "email" | "in_app";
    };
  }>,
) {
  const now = new Date();

  if (input.profile) {
    const identityPatch: Partial<{
      name: string;
      email: string;
      updatedAt: Date;
    }> = {};

    if (typeof input.profile.fullName === "string" && input.profile.fullName) {
      identityPatch.name = input.profile.fullName;
    }
    if (typeof input.profile.email === "string" && input.profile.email) {
      identityPatch.email = input.profile.email;
    }
    if (identityPatch.name !== undefined || identityPatch.email !== undefined) {
      identityPatch.updatedAt = now;
      await db
        .update(userTable)
        .set(identityPatch)
        .where(and(eq(userTable.id, userId), isNull(userTable.deletedAt)));
    }

    await db
      .insert(userProfileSettingsTable)
      .values({
        userId,
        contactPhone: input.profile.contactPhone ?? null,
        timezone: input.profile.timezone ?? "UTC",
        baseCurrency: input.profile.baseCurrency ?? "USD",
        reportingContactEmail: input.profile.reportingContact ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userProfileSettingsTable.userId,
        set: {
          contactPhone: input.profile.contactPhone ?? null,
          timezone: input.profile.timezone ?? "UTC",
          baseCurrency: input.profile.baseCurrency ?? "USD",
          reportingContactEmail: input.profile.reportingContact ?? null,
          updatedAt: now,
        },
      });
  }

  if (input.dashboardPreferences) {
    await db
      .insert(userDashboardPreferencesTable)
      .values({
        userId,
        defaultLandingPage:
          input.dashboardPreferences.defaultLandingPage ??
          "/dashboard/overview",
        compactTableDensity:
          input.dashboardPreferences.compactTableDensity ?? false,
        showUsdInMillions: input.dashboardPreferences.showUsdInMillions ?? true,
        weeklyDigest: input.dashboardPreferences.weeklyDigest ?? true,
        documentDelivery:
          input.dashboardPreferences.documentDelivery ?? "email",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userDashboardPreferencesTable.userId,
        set: {
          defaultLandingPage:
            input.dashboardPreferences.defaultLandingPage ??
            "/dashboard/overview",
          compactTableDensity:
            input.dashboardPreferences.compactTableDensity ?? false,
          showUsdInMillions:
            input.dashboardPreferences.showUsdInMillions ?? true,
          weeklyDigest: input.dashboardPreferences.weeklyDigest ?? true,
          documentDelivery:
            input.dashboardPreferences.documentDelivery ?? "email",
          updatedAt: now,
        },
      });
  }

  if (input.notificationPreferences) {
    await db
      .delete(userNotificationPreferencesTable)
      .where(eq(userNotificationPreferencesTable.userId, userId));

    if (input.notificationPreferences.length > 0) {
      await db.insert(userNotificationPreferencesTable).values(
        input.notificationPreferences.map((row) => ({
          userId,
          preferenceKey: row.preferenceKey,
          channel: row.channel,
          enabled: row.enabled,
          criticalOnly: row.criticalOnly ?? false,
          updatedAt: now,
        })),
      );
    }
  }
}

export async function createBankAccountForUser(
  userId: string,
  input: {
    accountHolder: string;
    bankName: string;
    ibanMasked: string;
    accountNumberMasked: string;
    bankAddress: string;
    swiftCode?: string;
    country: string;
    currency: string;
    isPrimary?: boolean;
  },
) {
  const now = new Date();

  if (input.isPrimary) {
    await db
      .update(bankAccountsTable)
      .set({ isPrimary: false, updatedAt: now })
      .where(eq(bankAccountsTable.userId, userId));
  }

  const [created] = await db
    .insert(bankAccountsTable)
    .values({
      userId,
      accountHolder: input.accountHolder,
      bankName: input.bankName,
      ibanMasked: input.ibanMasked,
      accountNumberMasked: input.accountNumberMasked,
      bankAddress: input.bankAddress,
      swiftCode: input.swiftCode ?? null,
      country: input.country,
      currency: input.currency,
      status: "pending",
      isPrimary: input.isPrimary ?? false,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function connectWalletForUser(
  userId: string,
  input: {
    provider: string;
    accountAddress: string;
    network: string;
    label?: string;
  },
) {
  const now = new Date();
  const provider = normalizeWalletProvider(input.provider);
  const accountAddress = normalizeWalletAddress(input.accountAddress);
  const network = normalizeWalletNetwork(input.network);
  const label = input.label?.trim();

  if (!provider || !accountAddress || !network) {
    throw new Error(DASHBOARD_WALLET_DOMAIN_ERRORS.invalidConnectInput);
  }

  return db.transaction(async (tx) => {
    const [existingConnection] = await tx
      .select()
      .from(walletConnectionsTable)
      .where(
        and(
          eq(walletConnectionsTable.provider, provider),
          eq(walletConnectionsTable.providerAccountId, accountAddress),
        ),
      )
      .limit(1);

    const [existingAddress] = await tx
      .select()
      .from(managedWalletAddressesTable)
      .where(
        and(
          eq(managedWalletAddressesTable.network, network),
          eq(managedWalletAddressesTable.address, accountAddress),
        ),
      )
      .limit(1);

    const [restrictedAddressForUser] = await tx
      .select({ id: managedWalletAddressesTable.id })
      .from(managedWalletAddressesTable)
      .where(
        and(
          eq(managedWalletAddressesTable.userId, userId),
          eq(managedWalletAddressesTable.address, accountAddress),
          inArray(managedWalletAddressesTable.verificationStatus, [
            "rejected",
            "inactive",
          ]),
        ),
      )
      .limit(1);

    if (existingConnection && existingConnection.userId !== userId) {
      throw new Error(
        DASHBOARD_WALLET_DOMAIN_ERRORS.connectionOwnershipConflict,
      );
    }
    if (existingAddress && existingAddress.userId !== userId) {
      throw new Error(DASHBOARD_WALLET_DOMAIN_ERRORS.addressOwnershipConflict);
    }
    if (restrictedAddressForUser) {
      throw new Error(DASHBOARD_WALLET_DOMAIN_ERRORS.addressReconnectRestricted);
    }

    let connection: NonNullable<typeof existingConnection>;
    if (existingConnection) {
      const [updatedConnection] = await tx
        .update(walletConnectionsTable)
        .set({
          status: "connected",
          primaryNetwork: network,
          connectedSince: now,
          updatedAt: now,
        })
        .where(eq(walletConnectionsTable.id, existingConnection.id))
        .returning();
      connection = requireInserted(
        updatedConnection,
        "Failed to update wallet connection",
      );
    } else {
      const [createdConnection] = await tx
        .insert(walletConnectionsTable)
        .values({
          userId,
          provider,
          providerAccountId: accountAddress,
          primaryNetwork: network,
          status: "connected",
          connectedSince: now,
          dailyTransferLimit: "0",
          usedToday: "0",
          policyProfile: "standard",
          updatedAt: now,
        })
        .returning();
      connection = requireInserted(
        createdConnection,
        "Failed to create wallet connection",
      );
    }

    let address: NonNullable<typeof existingAddress>;
    if (existingAddress) {
      const [updatedAddress] = await tx
        .update(managedWalletAddressesTable)
        .set({
          connectionId: connection.id,
          label: label || existingAddress.label,
          connectionStatus: "connected",
          lastActivityAt: now,
          updatedAt: now,
        })
        .where(eq(managedWalletAddressesTable.id, existingAddress.id))
        .returning();
      address = requireInserted(
        updatedAddress,
        "Failed to update managed wallet address",
      );
    } else {
      const existingUserAddress = await tx
        .select({ id: managedWalletAddressesTable.id })
        .from(managedWalletAddressesTable)
        .where(eq(managedWalletAddressesTable.userId, userId))
        .limit(1);

      const [createdAddress] = await tx
        .insert(managedWalletAddressesTable)
        .values({
          userId,
          connectionId: connection.id,
          walletRef: createWalletRef(),
          label: label || "Linked wallet",
          address: accountAddress,
          network,
          type: existingUserAddress[0] ? "secondary" : "primary",
          balance: "0",
          allocationPercent: null,
          verificationStatus: "pending",
          connectionStatus: "connected",
          addedAt: now,
          lastActivityAt: now,
          updatedAt: now,
        })
        .returning();
      address = requireInserted(
        createdAddress,
        "Failed to create managed wallet address",
      );
    }

    await tx.insert(walletActivityEventsTable).values({
      userId,
      connectionId: connection.id,
      walletAddressId: address.id,
      action: "Connected wallet session",
      actorUserId: userId,
      actorLabel: "Current User",
      target: address.label,
      network,
      status: "connected",
      occurredAt: now,
    });

    await tx.insert(userNotificationsTable).values({
      userId,
      category: "wallet",
      title: "Wallet connected",
      message: `Wallet ${address.label} (${address.network}) is connected.`,
      channel: "in_app",
      eventStatus: "connected",
      entityType: "wallet",
      entityRef: address.id,
      isRead: false,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return {
      connection,
      address,
    };
  });
}

export async function disconnectWalletForUser(
  userId: string,
  input: {
    accountAddress: string;
    network: string;
  },
) {
  const now = new Date();
  const accountAddress = normalizeWalletAddress(input.accountAddress);
  const network = normalizeWalletNetwork(input.network);

  if (!accountAddress || !network) {
    throw new Error(DASHBOARD_WALLET_DOMAIN_ERRORS.invalidDisconnectInput);
  }

  const rows = await db
    .select()
    .from(managedWalletAddressesTable)
    .where(
      and(
        eq(managedWalletAddressesTable.userId, userId),
        eq(managedWalletAddressesTable.network, network),
        eq(managedWalletAddressesTable.address, accountAddress),
      ),
    )
    .limit(1);

  const existingAddress = rows[0];
  if (!existingAddress) {
    throw new Error(DASHBOARD_WALLET_DOMAIN_ERRORS.addressNotFound);
  }

  const [updatedAddress] = await db
    .update(managedWalletAddressesTable)
    .set({
      connectionStatus: "inactive",
      connectionId: null,
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(managedWalletAddressesTable.id, existingAddress.id))
    .returning();

  if (existingAddress.connectionId) {
    const otherConnectedAddresses = await db
      .select({ id: managedWalletAddressesTable.id })
      .from(managedWalletAddressesTable)
      .where(
        and(
          eq(managedWalletAddressesTable.userId, userId),
          eq(managedWalletAddressesTable.connectionId, existingAddress.connectionId),
          eq(managedWalletAddressesTable.connectionStatus, "connected"),
          not(eq(managedWalletAddressesTable.id, existingAddress.id)),
        ),
      )
      .limit(1);

    if (!otherConnectedAddresses[0]) {
      await db
        .update(walletConnectionsTable)
        .set({
          status: "inactive",
          updatedAt: now,
        })
        .where(
          and(
            eq(walletConnectionsTable.id, existingAddress.connectionId),
            eq(walletConnectionsTable.userId, userId),
          ),
        );
    }
  }

  await db.insert(walletActivityEventsTable).values({
    userId,
    connectionId: existingAddress.connectionId,
    walletAddressId: existingAddress.id,
    action: "Disconnected wallet address",
    actorUserId: userId,
    actorLabel: "Current User",
    target: existingAddress.label,
    network: existingAddress.network,
    status: "inactive",
    occurredAt: now,
  });

  await insertUserNotification({
    userId,
    category: "wallet",
    title: "Wallet disconnected",
    message: `Wallet ${existingAddress.label} (${existingAddress.network}) is disconnected.`,
    status: "inactive",
    entityType: "wallet",
    entityRef: existingAddress.id,
  });

  return requireInserted(updatedAddress, "Failed to disconnect wallet address");
}

export async function setPrimaryWalletAddressForUser(
  userId: string,
  input: {
    accountAddress: string;
    network: string;
  },
) {
  const now = new Date();
  const accountAddress = normalizeWalletAddress(input.accountAddress);
  const network = normalizeWalletNetwork(input.network);

  if (!accountAddress || !network) {
    throw new Error(DASHBOARD_WALLET_DOMAIN_ERRORS.invalidPrimarySelectionInput);
  }

  return db.transaction(async (tx) => {
    const [targetAddress] = await tx
      .select()
      .from(managedWalletAddressesTable)
      .where(
        and(
          eq(managedWalletAddressesTable.userId, userId),
          eq(managedWalletAddressesTable.network, network),
          eq(managedWalletAddressesTable.address, accountAddress),
        ),
      )
      .limit(1);

    if (!targetAddress) {
      throw new Error(DASHBOARD_WALLET_DOMAIN_ERRORS.addressNotFound);
    }

    if (targetAddress.type !== "primary" && targetAddress.type !== "secondary") {
      throw new Error(DASHBOARD_WALLET_DOMAIN_ERRORS.invalidPrimarySelectionInput);
    }

    if (targetAddress.type === "primary") {
      return targetAddress;
    }

    await tx
      .update(managedWalletAddressesTable)
      .set({
        type: "secondary",
        updatedAt: now,
      })
      .where(
        and(
          eq(managedWalletAddressesTable.userId, userId),
          or(
            eq(managedWalletAddressesTable.type, "primary"),
            eq(managedWalletAddressesTable.type, "secondary"),
          ),
          not(eq(managedWalletAddressesTable.id, targetAddress.id)),
        ),
      );

    const [updatedTargetAddress] = await tx
      .update(managedWalletAddressesTable)
      .set({
        type: "primary",
        updatedAt: now,
        lastActivityAt: now,
      })
      .where(eq(managedWalletAddressesTable.id, targetAddress.id))
      .returning();

    await tx.insert(walletActivityEventsTable).values({
      userId,
      connectionId: targetAddress.connectionId,
      walletAddressId: targetAddress.id,
      action: "Set primary wallet address",
      actorUserId: userId,
      actorLabel: "Current User",
      target: targetAddress.label,
      network: targetAddress.network,
      status: "active",
      occurredAt: now,
    });

    await tx.insert(userNotificationsTable).values({
      userId,
      category: "wallet",
      title: "Primary wallet updated",
      message: `Wallet ${targetAddress.label} is now your primary wallet.`,
      channel: "in_app",
      eventStatus: "active",
      entityType: "wallet",
      entityRef: targetAddress.id,
      isRead: false,
      readAt: null,
      createdAt: now,
      updatedAt: now,
    });

    return requireInserted(
      updatedTargetAddress,
      "Failed to set primary wallet address",
    );
  });
}

export async function getMintOpsQueueForAdmin() {
  const mintRows = await db
    .select({
      id: mintRequestsTable.id,
      requestRef: mintRequestsTable.requestRef,
      userId: mintRequestsTable.userId,
      amount: mintRequestsTable.amount,
      submittedAt: mintRequestsTable.submittedAt,
      destinationAddressRaw: mintRequestsTable.destinationAddressRaw,
      status: mintRequestsTable.status,
    })
    .from(mintRequestsTable)
    .orderBy(desc(mintRequestsTable.submittedAt))
    .limit(300);

  if (mintRows.length === 0) {
    return [] as DashboardState["redemptionOpsQueue"];
  }

  const mintIds = mintRows.map((row) => row.id);
  const timelineRows = await db
    .select({
      mintRequestId: requestEventsTable.mintRequestId,
      label: requestEventsTable.label,
      status: requestEventsTable.status,
      occurredAt: requestEventsTable.occurredAt,
      actorLabel: requestEventsTable.actorLabel,
      note: requestEventsTable.note,
    })
    .from(requestEventsTable)
    .where(inArray(requestEventsTable.mintRequestId, mintIds))
    .orderBy(desc(requestEventsTable.occurredAt));

  const timelineByMintId = new Map<string, ReturnType<typeof timelineRow>[]>();
  for (const row of timelineRows) {
    if (!row.mintRequestId) {
      continue;
    }
    const current = timelineByMintId.get(row.mintRequestId) ?? [];
    current.push(timelineRow(row));
    timelineByMintId.set(row.mintRequestId, current);
  }

  const userIds = Array.from(new Set(mintRows.map((row) => row.userId)));
  const [userMap, preferredWalletByUserId] = await Promise.all([
    getUserNameMap(userIds),
    getPreferredConnectedWalletAddressByUserId(userIds),
  ]);

  return mintRows.map((row) => ({
    onchainWalletAddress:
      row.destinationAddressRaw && isAddressLike(row.destinationAddressRaw)
        ? toChecksumAddress(row.destinationAddressRaw)
        : (() => {
            const fallbackAddress = preferredWalletByUserId.get(row.userId);
            if (fallbackAddress && isAddressLike(fallbackAddress)) {
              return toChecksumAddress(fallbackAddress);
            }
            return undefined;
          })(),
    requestId: row.requestRef,
    user: userMap.get(row.userId) ?? "Unknown User",
    amount: toNumber(row.amount),
    submittedAt: toIso(row.submittedAt),
    destinationAccount: row.destinationAddressRaw ?? undefined,
    status: row.status,
    assignee: "Mint Ops",
    riskFlag: undefined,
    kybState: undefined,
    queuePos: undefined,
    sla: undefined,
    timeline: timelineByMintId.get(row.id) ?? [],
  }));
}

export async function getRedemptionOpsQueueForAdmin() {
  const redeemRows = await db
    .select({
      id: redeemRequestsTable.id,
      requestRef: redeemRequestsTable.requestRef,
      userId: redeemRequestsTable.userId,
      amount: redeemRequestsTable.amount,
      submittedAt: redeemRequestsTable.submittedAt,
      destinationAccountMasked: redeemRequestsTable.destinationAccountMasked,
      status: redeemRequestsTable.status,
      queuePosition: redeemRequestsTable.queuePosition,
    })
    .from(redeemRequestsTable)
    .orderBy(desc(redeemRequestsTable.submittedAt))
    .limit(300);

  if (redeemRows.length === 0) {
    return [] as DashboardState["redemptionOpsQueue"];
  }

  const redeemIds = redeemRows.map((row) => row.id);
  const [timelineRows, opsRows] = await Promise.all([
    db
      .select({
        redeemRequestId: requestEventsTable.redeemRequestId,
        label: requestEventsTable.label,
        status: requestEventsTable.status,
        occurredAt: requestEventsTable.occurredAt,
        actorLabel: requestEventsTable.actorLabel,
        note: requestEventsTable.note,
      })
      .from(requestEventsTable)
      .where(inArray(requestEventsTable.redeemRequestId, redeemIds))
      .orderBy(desc(requestEventsTable.occurredAt)),
    db
      .select({
        redeemRequestId: requestOperationsTable.redeemRequestId,
        assigneeUserId: requestOperationsTable.assigneeUserId,
        queuePosition: requestOperationsTable.queuePosition,
        riskLevel: requestOperationsTable.riskLevel,
        kybState: requestOperationsTable.kybState,
        slaTargetAt: requestOperationsTable.slaTargetAt,
      })
      .from(requestOperationsTable)
      .where(inArray(requestOperationsTable.redeemRequestId, redeemIds)),
  ]);

  const timelineByRedeemId = new Map<string, ReturnType<typeof timelineRow>[]>();
  for (const row of timelineRows) {
    if (!row.redeemRequestId) {
      continue;
    }
    const current = timelineByRedeemId.get(row.redeemRequestId) ?? [];
    current.push(timelineRow(row));
    timelineByRedeemId.set(row.redeemRequestId, current);
  }

  const opsByRedeemRequestId = new Map(
    opsRows.map((row) => [row.redeemRequestId ?? "", row]),
  );

  const assigneeIds = opsRows
    .map((row) => row.assigneeUserId)
    .filter((value): value is string => Boolean(value));
  const userIds = Array.from(
    new Set([...redeemRows.map((row) => row.userId), ...assigneeIds]),
  );
  const [userMap, preferredWalletByUserId] = await Promise.all([
    getUserNameMap(userIds),
    getPreferredConnectedWalletAddressByUserId(
      Array.from(new Set(redeemRows.map((row) => row.userId))),
    ),
  ]);

  return redeemRows.map((row) => {
    const ops = opsByRedeemRequestId.get(row.id);
    const walletAddress = preferredWalletByUserId.get(row.userId);
    return {
      requestId: row.requestRef,
      user: userMap.get(row.userId) ?? "Unknown User",
      amount: toNumber(row.amount),
      submittedAt: toIso(row.submittedAt),
      destinationAccount: row.destinationAccountMasked,
      onchainWalletAddress:
        walletAddress && isAddressLike(walletAddress)
          ? toChecksumAddress(walletAddress)
          : undefined,
      status: row.status,
      assignee:
        (ops?.assigneeUserId ? userMap.get(ops.assigneeUserId) : undefined) ??
        "Unassigned",
      riskFlag: ops?.riskLevel ?? undefined,
      kybState: ops?.kybState ?? undefined,
      queuePos: ops?.queuePosition ?? row.queuePosition ?? undefined,
      sla: ops?.slaTargetAt ? toIso(ops.slaTargetAt) : undefined,
      timeline: timelineByRedeemId.get(row.id) ?? [],
    };
  });
}

function toMintStatusLabel(
  status: "under_review" | "approved" | "rejected" | "completed",
) {
  if (status === "under_review") {
    return "Moved to review";
  }
  if (status === "approved") {
    return "Approved by ops";
  }
  if (status === "rejected") {
    return "Rejected by ops";
  }
  return "Completed by ops";
}

function toRedeemStatusLabel(
  status: "queued" | "processing" | "approved" | "rejected" | "completed",
) {
  if (status === "queued") {
    return "Queued by redemption ops";
  }
  if (status === "processing") {
    return "Moved to processing";
  }
  if (status === "approved") {
    return "Approved for payout";
  }
  if (status === "rejected") {
    return "Rejected by redemption ops";
  }
  return "Payout completed";
}

async function findPrimaryConnectedWalletAddressForUser(userId: string) {
  const addressByUserId = await getPreferredConnectedWalletAddressByUserId([
    userId,
  ]);
  return addressByUserId.get(userId) ?? null;
}

async function getPreferredConnectedWalletAddressByUserId(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const rows = await db
    .select({
      userId: managedWalletAddressesTable.userId,
      address: managedWalletAddressesTable.address,
      type: managedWalletAddressesTable.type,
      addedAt: managedWalletAddressesTable.addedAt,
    })
    .from(managedWalletAddressesTable)
    .where(
      and(
        inArray(managedWalletAddressesTable.userId, userIds),
        eq(managedWalletAddressesTable.connectionStatus, "connected"),
        eq(managedWalletAddressesTable.verificationStatus, "verified"),
      ),
    )
    .orderBy(
      asc(managedWalletAddressesTable.userId),
      desc(managedWalletAddressesTable.addedAt),
    );

  const preferred = new Map<string, string>();
  for (const row of rows) {
    const current = preferred.get(row.userId);
    if (!current) {
      preferred.set(row.userId, row.address);
      continue;
    }
    if (row.type === "primary") {
      preferred.set(row.userId, row.address);
    }
  }

  return preferred;
}

function onchainExecutionNote(input: {
  action: "mint" | "redeem";
  functionName: string;
  txHash: string;
  blockNumber: bigint;
  adminWalletAddress?: string;
  requestedByLabel?: string;
}) {
  const adminWalletAddress = input.adminWalletAddress?.trim();
  const adminWalletSection = adminWalletAddress
    ? ` Admin wallet: ${adminWalletAddress}.`
    : "";
  const requestedBy = input.requestedByLabel?.trim();
  const requestedBySection = requestedBy ? ` Requested: ${requestedBy}.` : "";
  return `On-chain ${input.action} executed via ${input.functionName}. Tx: ${input.txHash}. Block: ${input.blockNumber.toString()}.${adminWalletSection}${requestedBySection}`;
}

export async function updateMintRequestStatusForAdmin(
  actorUserId: string,
  requestRef: string,
  input: {
    status: "under_review" | "approved" | "rejected";
    note?: string;
    txHash?: string;
    adminWalletAddress?: string;
    chainId?: number;
  },
) {
  const now = new Date();
  const existingRows = await db
    .select()
    .from(mintRequestsTable)
    .where(eq(mintRequestsTable.requestRef, requestRef))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    throw new Error(DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.mintRequestNotFound);
  }
  if (existing.status === "completed") {
    throw new Error(
      DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.requestAlreadyCompleted,
    );
  }

  let nextStatus: "under_review" | "rejected" | "completed" =
    input.status === "approved" ? "completed" : input.status;
  let eventNote: string | null = input.note?.trim() || null;
  if (input.status === "approved") {
    if (!input.txHash) {
      throw new Error(
        `${DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.onchainExecutionFailed}: txHash is required for approval`,
      );
    }

    const requestDestination =
      existing.destinationAddressRaw && isAddressLike(existing.destinationAddressRaw)
        ? toChecksumAddress(existing.destinationAddressRaw)
        : null;
    const fallbackDestination = requestDestination
      ? null
      : await findPrimaryConnectedWalletAddressForUser(existing.userId);
    const destinationAddress = requestDestination
      ? requestDestination
      : fallbackDestination && isAddressLike(fallbackDestination)
        ? toChecksumAddress(fallbackDestination)
        : null;

    if (!destinationAddress) {
      throw new Error(
        DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.mintDestinationWalletMissing,
      );
    }

    try {
      const chainResult = await verifyMintApprovalTx({
        txHash: input.txHash,
        recipientAddress: destinationAddress,
        amount: existing.amount,
        adminWalletAddress: input.adminWalletAddress,
        chainId: input.chainId,
      });
      nextStatus = "completed";
      eventNote = onchainExecutionNote({
        action: "mint",
        functionName: chainResult.functionName,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        adminWalletAddress: input.adminWalletAddress,
        requestedByLabel: input.note,
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unknown on-chain failure";
      throw new Error(
        `${DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.onchainExecutionFailed}: ${detail}`,
      );
    }
  }

  const [updated] = await db
    .update(mintRequestsTable)
    .set({
      status: nextStatus,
      completedAt: nextStatus === "completed" ? now : null,
      rejectedReason: nextStatus === "rejected" ? (eventNote ?? null) : null,
      updatedAt: now,
    })
    .where(eq(mintRequestsTable.id, existing.id))
    .returning();

  const statusEventLabel = toMintStatusLabel(nextStatus);
  await db.insert(requestEventsTable).values({
    requestType: "mint",
    mintRequestId: existing.id,
    label: statusEventLabel,
    status: nextStatus,
    actorUserId,
    actorLabel: "Mint Ops",
    note: eventNote,
    occurredAt: now,
  });

  await insertUserNotification({
    userId: existing.userId,
    category: "mint",
    title:
      nextStatus === "completed"
        ? "Mint approved"
        : nextStatus === "rejected"
          ? "Mint rejected"
          : "Mint status updated",
    message:
      nextStatus === "completed"
        ? `Mint request ${existing.requestRef} was approved.`
        : nextStatus === "rejected"
          ? `Mint request ${existing.requestRef} was rejected.`
          : `Mint request ${existing.requestRef} moved to review.`,
    status: nextStatus,
    entityType: "mint_request",
    entityRef: existing.requestRef,
  });

  return requireInserted(updated, "Failed to update mint request status");
}

export async function updateRedeemRequestStatusForAdmin(
  actorUserId: string,
  requestRef: string,
  input: {
    status: "queued" | "processing" | "approved" | "rejected";
    note?: string;
    queuePosition?: number;
    txHash?: string;
    adminWalletAddress?: string;
    chainId?: number;
  },
) {
  const now = new Date();
  const existingRows = await db
    .select()
    .from(redeemRequestsTable)
    .where(eq(redeemRequestsTable.requestRef, requestRef))
    .limit(1);

  const existing = existingRows[0];
  if (!existing) {
    throw new Error(DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.redeemRequestNotFound);
  }
  if (existing.status === "completed") {
    throw new Error(
      DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.requestAlreadyCompleted,
    );
  }

  let nextStatus: "queued" | "processing" | "rejected" | "completed" =
    input.status === "approved" ? "completed" : input.status;
  let eventNote: string | null = input.note?.trim() || null;
  if (input.status === "approved") {
    if (!input.txHash) {
      throw new Error(
        `${DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.onchainExecutionFailed}: txHash is required for approval`,
      );
    }

    const sourceAddress = await findPrimaryConnectedWalletAddressForUser(
      existing.userId,
    );
    if (!sourceAddress || !isAddressLike(sourceAddress)) {
      throw new Error(
        DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.redeemSourceWalletMissing,
      );
    }

    try {
      const chainResult = await verifyRedeemApprovalTx({
        txHash: input.txHash,
        holderAddress: sourceAddress,
        amount: existing.amount,
        adminWalletAddress: input.adminWalletAddress,
        chainId: input.chainId,
      });
      nextStatus = "completed";
      eventNote = onchainExecutionNote({
        action: "redeem",
        functionName: chainResult.functionName,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        adminWalletAddress: input.adminWalletAddress,
        requestedByLabel: input.note,
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unknown on-chain failure";
      throw new Error(
        `${DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.onchainExecutionFailed}: ${detail}`,
      );
    }
  }

  const nextQueuePosition =
    nextStatus === "completed" || nextStatus === "rejected"
      ? 0
      : input.queuePosition ?? existing.queuePosition ?? 0;

  const [updated] = await db
    .update(redeemRequestsTable)
    .set({
      status: nextStatus,
      queuePosition: nextQueuePosition,
      completedAt: nextStatus === "completed" ? now : null,
      rejectedReason: nextStatus === "rejected" ? (eventNote ?? null) : null,
      updatedAt: now,
    })
    .where(eq(redeemRequestsTable.id, existing.id))
    .returning();

  await db
    .insert(requestOperationsTable)
    .values({
      requestType: "redeem",
      redeemRequestId: existing.id,
      queuePosition: nextQueuePosition,
      operationalNote: eventNote,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: requestOperationsTable.redeemRequestId,
      set: {
        queuePosition: nextQueuePosition,
        operationalNote: eventNote,
        updatedAt: now,
      },
    });

  const statusEventLabel = toRedeemStatusLabel(nextStatus);
  await db.insert(requestEventsTable).values({
    requestType: "redeem",
    redeemRequestId: existing.id,
    label: statusEventLabel,
    status: nextStatus,
    actorUserId,
    actorLabel: "Redemption Ops",
    note: eventNote,
    occurredAt: now,
  });

  await insertUserNotification({
    userId: existing.userId,
    category: "redeem",
    title:
      nextStatus === "completed"
        ? "Redemption approved"
        : nextStatus === "rejected"
          ? "Redemption rejected"
          : nextStatus === "processing"
            ? "Redemption processing"
            : "Redemption status updated",
    message:
      nextStatus === "completed"
        ? `Redemption request ${existing.requestRef} was approved.`
        : nextStatus === "rejected"
          ? `Redemption request ${existing.requestRef} was rejected.`
          : nextStatus === "processing"
            ? `Redemption request ${existing.requestRef} is processing.`
            : `Redemption request ${existing.requestRef} was queued.`,
    status: nextStatus,
    entityType: "redeem_request",
    entityRef: existing.requestRef,
  });

  return requireInserted(updated, "Failed to update redeem request status");
}
