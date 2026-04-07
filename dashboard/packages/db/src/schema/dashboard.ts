import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { sessionTable, userTable } from "./identity";

export const dashboardSchema = pgSchema("dashboard");

const WORKFLOW_STATUS_VALUES = [
  "active",
  "connected",
  "pending",
  "under_review",
  "approved",
  "verified",
  "rejected",
  "completed",
  "blocked",
  "inactive",
  "warning",
  "stale",
  "critical",
  "draft",
  "submitted",
  "queued",
  "processing",
  "not_started",
  "in_progress",
  "needs_update",
] as const;

export const requestTypeEnum = dashboardSchema.enum("request_type", [
  "mint",
  "redeem",
]);

export const workflowStatusEnum = dashboardSchema.enum(
  "workflow_status",
  WORKFLOW_STATUS_VALUES,
);

export const mintRequestStatusEnum = dashboardSchema.enum(
  "mint_request_status",
  ["draft", "submitted", "under_review", "approved", "rejected", "completed"],
);

export const redeemRequestStatusEnum = dashboardSchema.enum(
  "redeem_request_status",
  [
    "draft",
    "submitted",
    "queued",
    "processing",
    "approved",
    "rejected",
    "completed",
  ],
);

export const kybCaseStatusEnum = dashboardSchema.enum("kyb_case_status", [
  "not_started",
  "in_progress",
  "under_review",
  "needs_update",
  "approved",
  "rejected",
  "blocked",
]);

export const kybDocumentCategoryEnum = dashboardSchema.enum(
  "kyb_document_category",
  ["identity", "address", "source_of_funds", "business"],
);

export const kybDocumentStatusEnum = dashboardSchema.enum(
  "kyb_document_status",
  [
    "not_started",
    "in_progress",
    "under_review",
    "needs_update",
    "approved",
    "rejected",
  ],
);

export const riskLevelEnum = dashboardSchema.enum("risk_level", [
  "low",
  "medium",
  "high",
]);

export const payoutRailEnum = dashboardSchema.enum("payout_rail", [
  "bank",
  "swift",
  "crypto",
]);

export const alertSeverityEnum = dashboardSchema.enum("alert_severity", [
  "warning",
  "stale",
  "critical",
]);

export const alertStatusEnum = dashboardSchema.enum("alert_status", [
  "pending",
  "active",
  "completed",
]);

export const walletAddressTypeEnum = dashboardSchema.enum(
  "wallet_address_type",
  ["primary", "secondary", "treasury", "withdrawal"],
);

export const walletVerificationStatusEnum = dashboardSchema.enum(
  "wallet_verification_status",
  ["pending", "under_review", "verified", "rejected", "inactive"],
);

export const walletConnectionStatusEnum = dashboardSchema.enum(
  "wallet_connection_status",
  ["connected", "pending", "inactive", "blocked"],
);

export const notificationChannelEnum = dashboardSchema.enum(
  "notification_channel",
  ["email", "in_app", "sms"],
);

export const documentDeliveryChannelEnum = dashboardSchema.enum(
  "document_delivery_channel",
  ["email", "in_app"],
);

export const snapshotScopeEnum = dashboardSchema.enum("snapshot_scope", [
  "public",
  "treasury",
]);

export const bankAccountsTable = dashboardSchema.table(
  "bank_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    accountHolder: text("account_holder").notNull(),
    bankName: text("bank_name").notNull(),
    ibanMasked: text("iban_masked").notNull(),
    swiftCode: text("swift_code"),
    country: text("country").notNull(),
    currency: text("currency").notNull(),
    status: workflowStatusEnum("status").notNull().default("pending"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("dashboard_bank_accounts_user_id_idx").on(table.userId),
    userPrimaryIdx: index("dashboard_bank_accounts_user_primary_idx").on(
      table.userId,
      table.isPrimary,
    ),
    userIbanUniqueIdx: uniqueIndex(
      "dashboard_bank_accounts_user_iban_unique",
    ).on(table.userId, table.ibanMasked),
  }),
);

export const walletConnectionsTable = dashboardSchema.table(
  "wallet_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    primaryNetwork: text("primary_network").notNull(),
    status: walletConnectionStatusEnum("status").notNull().default("connected"),
    connectedSince: timestamp("connected_since", { withTimezone: true }),
    dailyTransferLimit: numeric("daily_transfer_limit", {
      precision: 20,
      scale: 2,
    }),
    usedToday: numeric("used_today", {
      precision: 20,
      scale: 2,
    }),
    policyProfile: text("policy_profile"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("dashboard_wallet_connections_user_id_idx").on(table.userId),
    userStatusIdx: index("dashboard_wallet_connections_user_status_idx").on(
      table.userId,
      table.status,
    ),
    providerAccountUniqueIdx: uniqueIndex(
      "dashboard_wallet_connections_provider_account_unique",
    ).on(table.provider, table.providerAccountId),
  }),
);

export const managedWalletAddressesTable = dashboardSchema.table(
  "managed_wallet_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(
      () => walletConnectionsTable.id,
      {
        onDelete: "set null",
      },
    ),
    walletRef: text("wallet_ref"),
    label: text("label").notNull(),
    address: text("address").notNull(),
    network: text("network").notNull(),
    type: walletAddressTypeEnum("type").notNull(),
    balance: numeric("balance", { precision: 20, scale: 2 }).notNull(),
    allocationPercent: numeric("allocation_percent", {
      precision: 5,
      scale: 2,
    }),
    verificationStatus: walletVerificationStatusEnum("verification_status")
      .notNull()
      .default("pending"),
    connectionStatus: walletConnectionStatusEnum("connection_status")
      .notNull()
      .default("connected"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("dashboard_managed_wallet_addresses_user_id_idx").on(
      table.userId,
    ),
    connectionIdx: index(
      "dashboard_managed_wallet_addresses_connection_id_idx",
    ).on(table.connectionId),
    verificationIdx: index(
      "dashboard_managed_wallet_addresses_verification_status_idx",
    ).on(table.verificationStatus),
    connectionStatusIdx: index(
      "dashboard_managed_wallet_addresses_connection_status_idx",
    ).on(table.connectionStatus),
    networkAddressUniqueIdx: uniqueIndex(
      "dashboard_managed_wallet_addresses_network_address_unique",
    ).on(table.network, table.address),
    walletRefUniqueIdx: uniqueIndex(
      "dashboard_managed_wallet_addresses_wallet_ref_unique",
    ).on(table.walletRef),
  }),
);

export const managedWalletAddressTagsTable = dashboardSchema.table(
  "managed_wallet_address_tags",
  {
    walletAddressId: uuid("wallet_address_id")
      .notNull()
      .references(() => managedWalletAddressesTable.id, {
        onDelete: "cascade",
      }),
    tag: text("tag").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({
      name: "dashboard_managed_wallet_address_tags_pkey",
      columns: [table.walletAddressId, table.tag],
    }),
    tagIdx: index("dashboard_managed_wallet_address_tags_tag_idx").on(
      table.tag,
    ),
  }),
);

export const walletActivityEventsTable = dashboardSchema.table(
  "wallet_activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    connectionId: uuid("connection_id").references(
      () => walletConnectionsTable.id,
      {
        onDelete: "set null",
      },
    ),
    walletAddressId: uuid("wallet_address_id").references(
      () => managedWalletAddressesTable.id,
      { onDelete: "set null" },
    ),
    action: text("action").notNull(),
    actorUserId: text("actor_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    actorLabel: text("actor_label"),
    target: text("target"),
    network: text("network"),
    status: workflowStatusEnum("status").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("dashboard_wallet_activity_events_user_id_idx").on(
      table.userId,
    ),
    occurredAtIdx: index("dashboard_wallet_activity_events_occurred_at_idx").on(
      table.occurredAt,
    ),
    statusIdx: index("dashboard_wallet_activity_events_status_idx").on(
      table.status,
    ),
  }),
);

export const kybCasesTable = dashboardSchema.table(
  "kyb_cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseRef: text("case_ref").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    status: kybCaseStatusEnum("status").notNull().default("not_started"),
    riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
    reviewerUserId: text("reviewer_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    caseRefUniqueIdx: uniqueIndex("dashboard_kyb_cases_case_ref_unique").on(
      table.caseRef,
    ),
    userIdx: index("dashboard_kyb_cases_user_id_idx").on(table.userId),
    statusSubmittedIdx: index("dashboard_kyb_cases_status_submitted_idx").on(
      table.status,
      table.submittedAt,
    ),
    reviewerStatusIdx: index("dashboard_kyb_cases_reviewer_status_idx").on(
      table.reviewerUserId,
      table.status,
    ),
  }),
);

export const kybCaseDocumentsTable = dashboardSchema.table(
  "kyb_case_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kybCaseId: uuid("kyb_case_id")
      .notNull()
      .references(() => kybCasesTable.id, { onDelete: "cascade" }),
    documentType: text("document_type").notNull(),
    category: kybDocumentCategoryEnum("category").notNull(),
    required: boolean("required").notNull().default(true),
    status: kybDocumentStatusEnum("status").notNull().default("not_started"),
    latestUploadedAt: timestamp("latest_uploaded_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    caseDocumentUniqueIdx: uniqueIndex(
      "dashboard_kyb_case_documents_case_document_unique",
    ).on(table.kybCaseId, table.documentType),
    caseStatusIdx: index("dashboard_kyb_case_documents_case_status_idx").on(
      table.kybCaseId,
      table.status,
    ),
  }),
);

export const kybDocumentSubmissionsTable = dashboardSchema.table(
  "kyb_document_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kybCaseDocumentId: uuid("kyb_case_document_id")
      .notNull()
      .references(() => kybCaseDocumentsTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewerUserId: text("reviewer_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    status: kybDocumentStatusEnum("status").notNull(),
    reviewerNote: text("reviewer_note"),
    storageUri: text("storage_uri"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    versionUniqueIdx: uniqueIndex(
      "dashboard_kyb_document_submissions_document_version_unique",
    ).on(table.kybCaseDocumentId, table.version),
    statusSubmittedIdx: index(
      "dashboard_kyb_document_submissions_status_submitted_idx",
    ).on(table.status, table.submittedAt),
  }),
);

export const kybCaseEventsTable = dashboardSchema.table(
  "kyb_case_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kybCaseId: uuid("kyb_case_id")
      .notNull()
      .references(() => kybCasesTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    status: workflowStatusEnum("status").notNull(),
    actorUserId: text("actor_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    actorLabel: text("actor_label"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    caseOccurredIdx: index("dashboard_kyb_case_events_case_occurred_idx").on(
      table.kybCaseId,
      table.occurredAt,
    ),
  }),
);

export const mintRequestsTable = dashboardSchema.table(
  "mint_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestRef: text("request_ref").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    submittedByUserId: text("submitted_by_user_id").references(
      () => userTable.id,
      {
        onDelete: "set null",
      },
    ),
    sourceBankAccountId: uuid("source_bank_account_id").references(
      () => bankAccountsTable.id,
      { onDelete: "set null" },
    ),
    destinationWalletAddressId: uuid(
      "destination_wallet_address_id",
    ).references(() => managedWalletAddressesTable.id, {
      onDelete: "set null",
    }),
    amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
    paymentReference: text("payment_reference").notNull(),
    destinationAddressRaw: text("destination_address_raw"),
    status: mintRequestStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    requestRefUniqueIdx: uniqueIndex(
      "dashboard_mint_requests_request_ref_unique",
    ).on(table.requestRef),
    userSubmittedIdx: index("dashboard_mint_requests_user_submitted_idx").on(
      table.userId,
      table.submittedAt,
    ),
    statusUpdatedIdx: index("dashboard_mint_requests_status_updated_idx").on(
      table.status,
      table.updatedAt,
    ),
    paymentReferenceIdx: index(
      "dashboard_mint_requests_payment_reference_idx",
    ).on(table.paymentReference),
  }),
);

export const redeemRequestsTable = dashboardSchema.table(
  "redeem_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestRef: text("request_ref").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    submittedByUserId: text("submitted_by_user_id").references(
      () => userTable.id,
      {
        onDelete: "set null",
      },
    ),
    assigneeUserId: text("assignee_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    destinationBankAccountId: uuid("destination_bank_account_id").references(
      () => bankAccountsTable.id,
      { onDelete: "set null" },
    ),
    amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
    destinationAccountMasked: text("destination_account_masked").notNull(),
    payoutRail: payoutRailEnum("payout_rail").notNull().default("bank"),
    queuePosition: integer("queue_position"),
    status: redeemRequestStatusEnum("status").notNull().default("submitted"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    requestRefUniqueIdx: uniqueIndex(
      "dashboard_redeem_requests_request_ref_unique",
    ).on(table.requestRef),
    userSubmittedIdx: index("dashboard_redeem_requests_user_submitted_idx").on(
      table.userId,
      table.submittedAt,
    ),
    assigneeStatusIdx: index(
      "dashboard_redeem_requests_assignee_status_idx",
    ).on(table.assigneeUserId, table.status),
    statusQueueIdx: index("dashboard_redeem_requests_status_queue_idx").on(
      table.status,
      table.queuePosition,
    ),
  }),
);

export const requestEventsTable = dashboardSchema.table(
  "request_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestType: requestTypeEnum("request_type").notNull(),
    mintRequestId: uuid("mint_request_id").references(
      () => mintRequestsTable.id,
      {
        onDelete: "cascade",
      },
    ),
    redeemRequestId: uuid("redeem_request_id").references(
      () => redeemRequestsTable.id,
      { onDelete: "cascade" },
    ),
    label: text("label").notNull(),
    status: workflowStatusEnum("status").notNull(),
    actorUserId: text("actor_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    actorLabel: text("actor_label"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    exactlyOneRequestCheck: check(
      "dashboard_request_events_exactly_one_request_ck",
      sql`(
        (${table.mintRequestId} IS NOT NULL AND ${table.redeemRequestId} IS NULL)
        OR
        (${table.mintRequestId} IS NULL AND ${table.redeemRequestId} IS NOT NULL)
      )`,
    ),
    requestTypeMatchesFkCheck: check(
      "dashboard_request_events_type_matches_fk_ck",
      sql`(
        (${table.requestType} = 'mint' AND ${table.mintRequestId} IS NOT NULL AND ${table.redeemRequestId} IS NULL)
        OR
        (${table.requestType} = 'redeem' AND ${table.redeemRequestId} IS NOT NULL AND ${table.mintRequestId} IS NULL)
      )`,
    ),
    mintOccurredIdx: index("dashboard_request_events_mint_occurred_idx").on(
      table.mintRequestId,
      table.occurredAt,
    ),
    redeemOccurredIdx: index("dashboard_request_events_redeem_occurred_idx").on(
      table.redeemRequestId,
      table.occurredAt,
    ),
    statusOccurredIdx: index("dashboard_request_events_status_occurred_idx").on(
      table.status,
      table.occurredAt,
    ),
  }),
);

export const requestOperationsTable = dashboardSchema.table(
  "request_operations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestType: requestTypeEnum("request_type").notNull(),
    mintRequestId: uuid("mint_request_id").references(
      () => mintRequestsTable.id,
      {
        onDelete: "cascade",
      },
    ),
    redeemRequestId: uuid("redeem_request_id").references(
      () => redeemRequestsTable.id,
      { onDelete: "cascade" },
    ),
    assigneeUserId: text("assignee_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    slaTargetAt: timestamp("sla_target_at", { withTimezone: true }),
    riskLevel: riskLevelEnum("risk_level"),
    kybState: workflowStatusEnum("kyb_state"),
    queuePosition: integer("queue_position"),
    operationalNote: text("operational_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    exactlyOneRequestCheck: check(
      "dashboard_request_operations_exactly_one_request_ck",
      sql`(
        (${table.mintRequestId} IS NOT NULL AND ${table.redeemRequestId} IS NULL)
        OR
        (${table.mintRequestId} IS NULL AND ${table.redeemRequestId} IS NOT NULL)
      )`,
    ),
    requestTypeMatchesFkCheck: check(
      "dashboard_request_operations_type_matches_fk_ck",
      sql`(
        (${table.requestType} = 'mint' AND ${table.mintRequestId} IS NOT NULL AND ${table.redeemRequestId} IS NULL)
        OR
        (${table.requestType} = 'redeem' AND ${table.redeemRequestId} IS NOT NULL AND ${table.mintRequestId} IS NULL)
      )`,
    ),
    assigneeIdx: index("dashboard_request_operations_assignee_idx").on(
      table.assigneeUserId,
    ),
    queuePositionIdx: index(
      "dashboard_request_operations_queue_position_idx",
    ).on(table.queuePosition),
    riskLevelIdx: index("dashboard_request_operations_risk_level_idx").on(
      table.riskLevel,
    ),
    mintUniqueIdx: uniqueIndex(
      "dashboard_request_operations_mint_request_unique",
    ).on(table.mintRequestId),
    redeemUniqueIdx: uniqueIndex(
      "dashboard_request_operations_redeem_request_unique",
    ).on(table.redeemRequestId),
  }),
);

export const reserveSnapshotsTable = dashboardSchema.table(
  "reserve_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotRef: text("snapshot_ref"),
    snapshotScope: snapshotScopeEnum("snapshot_scope").notNull(),
    snapshotAt: timestamp("snapshot_at", { withTimezone: true }).notNull(),
    reservesAmount: numeric("reserves_amount", {
      precision: 20,
      scale: 2,
    }).notNull(),
    liabilitiesAmount: numeric("liabilities_amount", {
      precision: 20,
      scale: 2,
    }).notNull(),
    coverageRatio: numeric("coverage_ratio", {
      precision: 7,
      scale: 4,
    }).notNull(),
    varianceAmount: numeric("variance_amount", { precision: 20, scale: 2 }),
    status: workflowStatusEnum("status").notNull().default("active"),
    feedFreshness: workflowStatusEnum("feed_freshness")
      .notNull()
      .default("active"),
    notes: text("notes"),
    publishedByUserId: text("published_by_user_id").references(
      () => userTable.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    snapshotRefUniqueIdx: uniqueIndex(
      "dashboard_reserve_snapshots_snapshot_ref_unique",
    ).on(table.snapshotRef),
    scopeSnapshotUniqueIdx: uniqueIndex(
      "dashboard_reserve_snapshots_scope_snapshot_unique",
    ).on(table.snapshotScope, table.snapshotAt),
    statusFreshnessSnapshotIdx: index(
      "dashboard_reserve_snapshots_status_freshness_snapshot_idx",
    ).on(table.status, table.feedFreshness, table.snapshotAt),
  }),
);

export const reserveSnapshotAllocationsTable = dashboardSchema.table(
  "reserve_snapshot_allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reserveSnapshotId: uuid("reserve_snapshot_id")
      .notNull()
      .references(() => reserveSnapshotsTable.id, { onDelete: "cascade" }),
    bucket: text("bucket").notNull(),
    amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
    sharePercent: numeric("share_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    snapshotBucketUniqueIdx: uniqueIndex(
      "dashboard_reserve_snapshot_allocations_snapshot_bucket_unique",
    ).on(table.reserveSnapshotId, table.bucket),
    snapshotIdx: index(
      "dashboard_reserve_snapshot_allocations_snapshot_idx",
    ).on(table.reserveSnapshotId),
  }),
);

export const reserveSnapshotEventsTable = dashboardSchema.table(
  "reserve_snapshot_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reserveSnapshotId: uuid("reserve_snapshot_id")
      .notNull()
      .references(() => reserveSnapshotsTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    status: workflowStatusEnum("status").notNull(),
    actorUserId: text("actor_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    actorLabel: text("actor_label"),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    snapshotOccurredIdx: index(
      "dashboard_reserve_snapshot_events_snapshot_occurred_idx",
    ).on(table.reserveSnapshotId, table.occurredAt),
  }),
);

export const alertsTable = dashboardSchema.table(
  "alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    alertRef: text("alert_ref"),
    domain: text("domain").notNull(),
    type: text("type").notNull(),
    severity: alertSeverityEnum("severity").notNull(),
    status: alertStatusEnum("status").notNull(),
    source: text("source").notNull(),
    ownerUserId: text("owner_user_id").references(() => userTable.id, {
      onDelete: "set null",
    }),
    ownerLabel: text("owner_label"),
    message: text("message").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => ({
    alertRefUniqueIdx: uniqueIndex("dashboard_alerts_alert_ref_unique").on(
      table.alertRef,
    ),
    domainStatusSeverityCreatedIdx: index(
      "dashboard_alerts_domain_status_severity_created_idx",
    ).on(table.domain, table.status, table.severity, table.createdAt),
    ownerStatusIdx: index("dashboard_alerts_owner_status_idx").on(
      table.ownerUserId,
      table.status,
    ),
  }),
);

export const userProfileSettingsTable = dashboardSchema.table(
  "user_profile_settings",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => userTable.id, { onDelete: "cascade" }),
    contactPhone: text("contact_phone"),
    timezone: text("timezone").notNull().default("UTC"),
    baseCurrency: text("base_currency").notNull().default("USD"),
    reportingContactEmail: text("reporting_contact_email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    timezoneIdx: index("dashboard_user_profile_settings_timezone_idx").on(
      table.timezone,
    ),
  }),
);

export const userNotificationPreferencesTable = dashboardSchema.table(
  "user_notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    preferenceKey: text("preference_key").notNull(),
    channel: notificationChannelEnum("channel").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    criticalOnly: boolean("critical_only").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userEnabledIdx: index(
      "dashboard_user_notification_preferences_user_enabled_idx",
    ).on(table.userId, table.enabled),
    userPreferenceChannelUniqueIdx: uniqueIndex(
      "dashboard_user_notification_preferences_user_preference_channel_unique",
    ).on(table.userId, table.preferenceKey, table.channel),
  }),
);

export const userDashboardPreferencesTable = dashboardSchema.table(
  "user_dashboard_preferences",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => userTable.id, { onDelete: "cascade" }),
    defaultLandingPage: text("default_landing_page")
      .notNull()
      .default("/dashboard/overview"),
    compactTableDensity: boolean("compact_table_density")
      .notNull()
      .default(false),
    showUsdInMillions: boolean("show_usd_in_millions").notNull().default(true),
    weeklyDigest: boolean("weekly_digest").notNull().default(true),
    documentDelivery: documentDeliveryChannelEnum("document_delivery")
      .notNull()
      .default("email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    defaultLandingPageIdx: index(
      "dashboard_user_dashboard_preferences_default_landing_page_idx",
    ).on(table.defaultLandingPage),
  }),
);

export const sessionMetadataTable = dashboardSchema.table(
  "session_metadata",
  {
    sessionId: text("session_id")
      .primaryKey()
      .references(() => sessionTable.id, { onDelete: "cascade" }),
    deviceLabel: text("device_label"),
    locationLabel: text("location_label"),
    riskStatus: workflowStatusEnum("risk_status").notNull().default("active"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    riskLastActiveIdx: index(
      "dashboard_session_metadata_risk_last_active_idx",
    ).on(table.riskStatus, table.lastActiveAt),
  }),
);
