import { Hono } from "hono";
import {
  DASHBOARD_EDITOR_ROLE_SLUGS,
  RBAC_ROLES,
  SUPER_ADMIN_ROLE_SLUG,
} from "@repo/auth/rbac";

import {
  DASHBOARD_ADMIN_BANK_ACCOUNT_DOMAIN_ERRORS,
  DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS,
  DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS,
  getAdminKybDocumentFile,
  getAdminKybCases,
  getAdminOverviewState,
  getAdminReserveManagementState,
  getAdminWalletState,
  updateAdminKybDocumentStatus,
  updateAdminBankAccountStatus,
  updateAdminKybCaseStatus,
} from "../lib/dashboard-admin-domain";
import {
  DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS,
  DASHBOARD_KYB_DOCUMENT_DOMAIN_ERRORS,
  connectWalletForUser,
  createBankAccountForUser,
  createMintRequestForUser,
  createRedeemRequestForUser,
  DASHBOARD_WALLET_DOMAIN_ERRORS,
  disconnectWalletForUser,
  getDashboardStateForUser,
  getMintOpsQueueForAdmin,
  getRedemptionOpsQueueForAdmin,
  setPrimaryWalletAddressForUser,
  uploadKybDocumentForUser,
  updateMintRequestStatusForAdmin,
  updateRedeemRequestStatusForAdmin,
  upsertDashboardSettingsForUser,
} from "../lib/dashboard-domain";
import {
  getUserWithRolesById,
  listUsersWithRolesPaginated,
  softDeleteUser,
  updateUserWithRoles,
  type UpdateDashboardUserInput,
  type UsersSortBy,
  type UsersSortDirection,
} from "../lib/users";
import {
  parseOptionalCurrencyCode,
  parseOptionalEmail,
  parseOptionalInternalPath,
  parseOptionalMultilineText,
  parseOptionalSingleLineText,
  parsePathParam,
  parseRequiredCurrencyCode,
  parseRequiredSingleLineText,
} from "../lib/input-validation";
import { KYB_FILE_STORAGE_ERRORS } from "../lib/kyb-file-storage";
import { redis } from "../lib/redis";
import { requireAuth } from "../middleware/auth";
import {
  requireAnyPermission,
  requireAnyRole,
  requirePermission,
  requireRole,
  requireTableOperation,
} from "../middleware/rbac";
import type { AppEnv } from "../types";

const ALLOWED_USERS_PAGE_SIZES = [1, 5, 10, 50] as const;
const ALLOWED_USERS_SORT_FIELDS: UsersSortBy[] = [
  "name",
  "email",
  "createdAt",
  "emailVerified",
];
const DEFAULT_USERS_PAGE_SIZE = 10;
const DEFAULT_USERS_SORT_BY: UsersSortBy = "createdAt";
const DEFAULT_USERS_SORT_DIRECTION: UsersSortDirection = "desc";
const ALLOWED_ROLE_SLUGS = new Set(RBAC_ROLES.map((role) => role.slug));
const ALLOWED_PAYOUT_RAILS = ["bank", "swift", "crypto"] as const;
const ALLOWED_NOTIFICATION_CHANNELS = ["email", "in_app", "sms"] as const;
const ALLOWED_DOCUMENT_DELIVERY_CHANNELS = ["email", "in_app"] as const;
const ALLOWED_ADMIN_MINT_STATUSES = [
  "under_review",
  "approved",
  "rejected",
] as const;
const ALLOWED_ADMIN_REDEEM_STATUSES = [
  "queued",
  "processing",
  "approved",
  "rejected",
] as const;
const ALLOWED_ADMIN_KYB_STATUSES = [
  "in_progress",
  "under_review",
  "approved",
  "rejected",
  "needs_update",
  "blocked",
] as const;
const ALLOWED_ADMIN_KYB_DOCUMENT_STATUSES = [
  "under_review",
  "approved",
  "rejected",
  "needs_update",
] as const;
const ALLOWED_ADMIN_BANK_ACCOUNT_STATUSES = [
  "pending",
  "under_review",
  "verified",
  "rejected",
  "inactive",
] as const;
const MAX_SHORT_INPUT_LENGTH = 150;
const MAX_NOTE_LENGTH = 500;
const MAX_IDENTIFIER_LENGTH = 200;
const DEFAULT_KYB_UPLOAD_WINDOW_SECONDS = 10 * 60;
const DEFAULT_KYB_UPLOAD_MAX_FILES = 10;
const DEFAULT_KYB_UPLOAD_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MULTIPART_FORM_OVERHEAD_BYTES = 512 * 1024;
const KYB_UPLOAD_WINDOW_SECONDS = parsePositiveInt(
  process.env.KYB_UPLOAD_RATE_LIMIT_WINDOW_SECONDS,
  DEFAULT_KYB_UPLOAD_WINDOW_SECONDS,
);
const KYB_UPLOAD_MAX_FILES = parsePositiveInt(
  process.env.KYB_UPLOAD_RATE_LIMIT_MAX_FILES,
  DEFAULT_KYB_UPLOAD_MAX_FILES,
);
const KYB_MAX_FILE_SIZE_BYTES = parsePositiveInt(
  process.env.KYB_MAX_FILE_SIZE_BYTES,
  DEFAULT_KYB_UPLOAD_MAX_FILE_SIZE_BYTES,
);
const KYB_MAX_FILE_SIZE_MB = Math.max(
  1,
  Math.floor(KYB_MAX_FILE_SIZE_BYTES / (1024 * 1024)),
);
const KYB_UPLOAD_WINDOW_MINUTES = Math.max(
  1,
  Math.ceil(KYB_UPLOAD_WINDOW_SECONDS / 60),
);

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.floor(parsed);
}

async function consumeKybUploadQuota(userId: string) {
  const key = `kyb-upload:${userId}`;

  try {
    const requestCount = await redis.incr(key);
    if (requestCount === 1) {
      await redis.expire(key, KYB_UPLOAD_WINDOW_SECONDS);
    }

    if (requestCount > KYB_UPLOAD_MAX_FILES) {
      const ttl = await redis.ttl(key);
      return {
        ok: false as const,
        code: "limit_exceeded" as const,
        retryAfterSeconds: ttl > 0 ? ttl : KYB_UPLOAD_WINDOW_SECONDS,
      };
    }

    return {
      ok: true as const,
    };
  } catch (error) {
    console.error("[kyb-upload] quota check failed", {
      userId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false as const,
      code: "unavailable" as const,
    };
  }
}

function parseUsersPageSize(value: string | undefined) {
  const parsed = parsePositiveInt(value, DEFAULT_USERS_PAGE_SIZE);
  if (
    ALLOWED_USERS_PAGE_SIZES.includes(
      parsed as (typeof ALLOWED_USERS_PAGE_SIZES)[number],
    )
  ) {
    return parsed;
  }
  return DEFAULT_USERS_PAGE_SIZE;
}

function parseUsersSortBy(value: string | undefined): UsersSortBy {
  if (value && ALLOWED_USERS_SORT_FIELDS.includes(value as UsersSortBy)) {
    return value as UsersSortBy;
  }
  return DEFAULT_USERS_SORT_BY;
}

function parseUsersSortDirection(
  value: string | undefined,
): UsersSortDirection {
  if (value === "asc" || value === "desc") {
    return value;
  }
  return DEFAULT_USERS_SORT_DIRECTION;
}

function parseUserIdParam(value: string) {
  const parsed = parsePathParam(value, {
    field: "user id",
    maxLength: MAX_IDENTIFIER_LENGTH,
  });
  return parsed.ok ? parsed.value : "";
}

function parseRoleSlugs(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalizedEntries: string[] = [];
  for (const entry of value) {
    const parsedSlug = parseRequiredSingleLineText(entry, {
      field: "roleSlugs entry",
      maxLength: 64,
    });
    if (!parsedSlug.ok) {
      return null;
    }
    normalizedEntries.push(parsedSlug.value);
  }

  const normalized = Array.from(new Set(normalizedEntries));

  const hasInvalidRole = normalized.some(
    (slug) =>
      !ALLOWED_ROLE_SLUGS.has(slug as (typeof RBAC_ROLES)[number]["slug"]),
  );
  if (hasInvalidRole) {
    return null;
  }

  return normalized;
}

function parseUpdateUserPayload(
  payload: unknown,
):
  | { ok: true; value: UpdateDashboardUserInput }
  | { ok: false; message: string } {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Invalid request body" };
  }

  const data = payload as Record<string, unknown>;
  const patch: UpdateDashboardUserInput = {};

  if (data.name !== undefined) {
    const name = parseRequiredSingleLineText(data.name, {
      field: "name",
      minLength: 2,
      maxLength: MAX_SHORT_INPUT_LENGTH,
      collapseWhitespace: true,
    });
    if (!name.ok) {
      return { ok: false, message: name.message };
    }
    patch.name = name.value;
  }

  if (data.email !== undefined) {
    const email = parseOptionalEmail(data.email, { field: "email" });
    if (!email.ok || !email.value) {
      return { ok: false, message: email.ok ? "email is required" : email.message };
    }
    patch.email = email.value;
  }

  if (data.emailVerified !== undefined) {
    if (typeof data.emailVerified !== "boolean") {
      return { ok: false, message: "emailVerified must be boolean" };
    }
    patch.emailVerified = data.emailVerified;
  }

  if (data.roleSlugs !== undefined) {
    const roleSlugs = parseRoleSlugs(data.roleSlugs);
    if (!roleSlugs) {
      return { ok: false, message: "roleSlugs contains invalid values" };
    }
    patch.roleSlugs = roleSlugs;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: "No valid fields provided for update" };
  }

  return { ok: true, value: patch };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseCreateMintPayload(payload: unknown):
  | {
      ok: true;
      value: {
        amount: number;
        paymentRef: string;
        destination: string;
        note?: string;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const amount = Number(payload.amount);
  const paymentRef = parseRequiredSingleLineText(payload.paymentRef, {
    field: "paymentRef",
    maxLength: MAX_SHORT_INPUT_LENGTH,
  });
  const destination = parseRequiredSingleLineText(payload.destination, {
    field: "destination",
    maxLength: MAX_SHORT_INPUT_LENGTH,
  });
  const note = parseOptionalMultilineText(payload.note, {
    field: "note",
    maxLength: MAX_NOTE_LENGTH,
  });

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "amount must be greater than 0" };
  }
  if (!paymentRef.ok) {
    return { ok: false, message: paymentRef.message };
  }
  if (!destination.ok) {
    return { ok: false, message: destination.message };
  }
  if (!note.ok) {
    return { ok: false, message: note.message };
  }

  return {
    ok: true,
    value: {
      amount,
      paymentRef: paymentRef.value,
      destination: destination.value,
      note: note.value,
    },
  };
}

function parseCreateRedeemPayload(payload: unknown):
  | {
      ok: true;
      value: {
        amount: number;
        destination: string;
        payoutRail: "bank" | "swift" | "crypto";
        note?: string;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const amount = Number(payload.amount);
  const destination = parseRequiredSingleLineText(payload.destination, {
    field: "destination",
    maxLength: MAX_SHORT_INPUT_LENGTH,
  });
  const payoutRail =
    typeof payload.payoutRail === "string" ? payload.payoutRail : "bank";
  const note = parseOptionalMultilineText(payload.note, {
    field: "note",
    maxLength: MAX_NOTE_LENGTH,
  });

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "amount must be greater than 0" };
  }
  if (!destination.ok) {
    return { ok: false, message: destination.message };
  }
  if (!note.ok) {
    return { ok: false, message: note.message };
  }
  if (
    !ALLOWED_PAYOUT_RAILS.includes(
      payoutRail as (typeof ALLOWED_PAYOUT_RAILS)[number],
    )
  ) {
    return { ok: false, message: "payoutRail is invalid" };
  }

  return {
    ok: true,
    value: {
      amount,
      destination: destination.value,
      payoutRail: payoutRail as "bank" | "swift" | "crypto",
      note: note.value,
    },
  };
}

type DashboardSettingsInput = Partial<{
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
}>;

function parseDashboardSettingsPayload(
  payload: unknown,
):
  | { ok: true; value: DashboardSettingsInput }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const patch: DashboardSettingsInput = {};

  if (payload.profile !== undefined) {
    if (!isRecord(payload.profile)) {
      return { ok: false, message: "profile must be an object" };
    }
    const fullName = parseOptionalSingleLineText(payload.profile.fullName, {
      field: "profile.fullName",
      maxLength: MAX_SHORT_INPUT_LENGTH,
      collapseWhitespace: true,
    });
    if (!fullName.ok) {
      return { ok: false, message: fullName.message };
    }

    const email = parseOptionalEmail(payload.profile.email, {
      field: "profile.email",
    });
    if (!email.ok) {
      return { ok: false, message: email.message };
    }

    const contactPhone = parseOptionalSingleLineText(
      payload.profile.contactPhone,
      {
        field: "profile.contactPhone",
        maxLength: 32,
        allowCodeLike: true,
      },
    );
    if (!contactPhone.ok) {
      return { ok: false, message: contactPhone.message };
    }

    const timezone = parseOptionalSingleLineText(payload.profile.timezone, {
      field: "profile.timezone",
      maxLength: 64,
      allowCodeLike: true,
    });
    if (!timezone.ok) {
      return { ok: false, message: timezone.message };
    }

    const baseCurrency = parseOptionalCurrencyCode(payload.profile.baseCurrency, {
      field: "profile.baseCurrency",
    });
    if (!baseCurrency.ok) {
      return { ok: false, message: baseCurrency.message };
    }

    const reportingContact = parseOptionalEmail(payload.profile.reportingContact, {
      field: "profile.reportingContact",
    });
    if (!reportingContact.ok) {
      return { ok: false, message: reportingContact.message };
    }

    patch.profile = {
      fullName: fullName.value,
      email: email.value,
      contactPhone: contactPhone.value,
      timezone: timezone.value,
      baseCurrency: baseCurrency.value,
      reportingContact: reportingContact.value,
    };
  }

  if (payload.dashboardPreferences !== undefined) {
    if (!isRecord(payload.dashboardPreferences)) {
      return { ok: false, message: "dashboardPreferences must be an object" };
    }
    const documentDelivery =
      typeof payload.dashboardPreferences.documentDelivery === "string"
        ? payload.dashboardPreferences.documentDelivery
        : undefined;

    if (
      documentDelivery !== undefined &&
      !ALLOWED_DOCUMENT_DELIVERY_CHANNELS.includes(
        documentDelivery as (typeof ALLOWED_DOCUMENT_DELIVERY_CHANNELS)[number],
      )
    ) {
      return { ok: false, message: "documentDelivery is invalid" };
    }

    patch.dashboardPreferences = {
      defaultLandingPage: undefined,
      compactTableDensity:
        typeof payload.dashboardPreferences.compactTableDensity === "boolean"
          ? payload.dashboardPreferences.compactTableDensity
          : undefined,
      showUsdInMillions:
        typeof payload.dashboardPreferences.showUsdInMillions === "boolean"
          ? payload.dashboardPreferences.showUsdInMillions
          : undefined,
      weeklyDigest:
        typeof payload.dashboardPreferences.weeklyDigest === "boolean"
          ? payload.dashboardPreferences.weeklyDigest
          : undefined,
      documentDelivery: documentDelivery as "email" | "in_app" | undefined,
    };

    const defaultLandingPage = parseOptionalInternalPath(
      payload.dashboardPreferences.defaultLandingPage,
      {
        field: "defaultLandingPage",
        maxLength: MAX_SHORT_INPUT_LENGTH,
      },
    );
    if (!defaultLandingPage.ok) {
      return { ok: false, message: defaultLandingPage.message };
    }
    patch.dashboardPreferences.defaultLandingPage = defaultLandingPage.value;
  }

  if (payload.notificationPreferences !== undefined) {
    if (!Array.isArray(payload.notificationPreferences)) {
      return { ok: false, message: "notificationPreferences must be an array" };
    }

    const parsedRows: DashboardSettingsInput["notificationPreferences"] = [];
    for (const row of payload.notificationPreferences) {
      if (!isRecord(row)) {
        return {
          ok: false,
          message: "notificationPreferences contains invalid entries",
        };
      }

      const preferenceKey = parseRequiredSingleLineText(row.preferenceKey, {
        field: "notificationPreferences.preferenceKey",
        maxLength: MAX_SHORT_INPUT_LENGTH,
      });
      const preferenceId = parseOptionalSingleLineText(row.id, {
        field: "notificationPreferences.id",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      const channel = typeof row.channel === "string" ? row.channel : "";
      const enabled = row.enabled;
      const criticalOnly = row.criticalOnly;
      if (!preferenceKey.ok) {
        return { ok: false, message: preferenceKey.message };
      }
      if (!preferenceId.ok) {
        return { ok: false, message: preferenceId.message };
      }
      if (
        !ALLOWED_NOTIFICATION_CHANNELS.includes(
          channel as (typeof ALLOWED_NOTIFICATION_CHANNELS)[number],
        )
      ) {
        return {
          ok: false,
          message: "notificationPreferences.channel is invalid",
        };
      }
      if (typeof enabled !== "boolean") {
        return {
          ok: false,
          message: "notificationPreferences.enabled must be boolean",
        };
      }
      if (criticalOnly !== undefined && typeof criticalOnly !== "boolean") {
        return {
          ok: false,
          message: "notificationPreferences.criticalOnly must be boolean",
        };
      }

      parsedRows.push({
        id: preferenceId.value,
        preferenceKey: preferenceKey.value,
        channel: channel as "email" | "in_app" | "sms",
        enabled,
        criticalOnly:
          typeof criticalOnly === "boolean" ? criticalOnly : undefined,
      });
    }

    patch.notificationPreferences = parsedRows;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: "No valid settings fields provided" };
  }

  return { ok: true, value: patch };
}

function parseCreateBankAccountPayload(payload: unknown):
  | {
      ok: true;
      value: {
        accountHolder: string;
        bankName: string;
        ibanMasked: string;
        swiftCode?: string;
        country: string;
        currency: string;
        isPrimary?: boolean;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const accountHolder = parseRequiredSingleLineText(payload.accountHolder, {
    field: "accountHolder",
    maxLength: MAX_SHORT_INPUT_LENGTH,
    collapseWhitespace: true,
  });
  const bankName = parseRequiredSingleLineText(payload.bankName, {
    field: "bankName",
    maxLength: MAX_SHORT_INPUT_LENGTH,
    collapseWhitespace: true,
  });
  const ibanMasked = parseRequiredSingleLineText(payload.ibanMasked, {
    field: "ibanMasked",
    maxLength: 64,
    allowCodeLike: true,
  });
  const swiftCode = parseOptionalSingleLineText(payload.swiftCode, {
    field: "swiftCode",
    maxLength: 20,
    allowCodeLike: true,
    transform: "upper",
  });
  const country = parseRequiredSingleLineText(payload.country, {
    field: "country",
    maxLength: 100,
    collapseWhitespace: true,
  });
  const currency = parseRequiredCurrencyCode(payload.currency, {
    field: "currency",
  });
  const isPrimary =
    typeof payload.isPrimary === "boolean" ? payload.isPrimary : undefined;

  if (!accountHolder.ok) {
    return { ok: false, message: accountHolder.message };
  }
  if (!bankName.ok) {
    return { ok: false, message: bankName.message };
  }
  if (!ibanMasked.ok) {
    return { ok: false, message: ibanMasked.message };
  }
  if (!swiftCode.ok) {
    return { ok: false, message: swiftCode.message };
  }
  if (!country.ok) {
    return { ok: false, message: country.message };
  }
  if (!currency.ok) {
    return { ok: false, message: currency.message };
  }

  return {
    ok: true,
    value: {
      accountHolder: accountHolder.value,
      bankName: bankName.value,
      ibanMasked: ibanMasked.value,
      swiftCode: swiftCode.value,
      country: country.value,
      currency: currency.value,
      isPrimary,
    },
  };
}

function parseConnectWalletPayload(payload: unknown):
  | {
      ok: true;
      value: {
        provider: string;
        accountAddress: string;
        network: string;
        label?: string;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const provider = parseRequiredSingleLineText(payload.provider, {
    field: "provider",
    maxLength: 80,
  });
  const accountAddress = parseRequiredSingleLineText(payload.accountAddress, {
    field: "accountAddress",
    maxLength: MAX_IDENTIFIER_LENGTH,
    allowCodeLike: true,
  });
  const network = parseRequiredSingleLineText(payload.network, {
    field: "network",
    maxLength: 80,
  });
  const label = parseOptionalSingleLineText(payload.label, {
    field: "label",
    maxLength: MAX_SHORT_INPUT_LENGTH,
    collapseWhitespace: true,
  });

  if (!provider.ok) {
    return { ok: false, message: provider.message };
  }
  if (!accountAddress.ok) {
    return { ok: false, message: accountAddress.message };
  }
  if (!network.ok) {
    return { ok: false, message: network.message };
  }
  if (!label.ok) {
    return { ok: false, message: label.message };
  }

  return {
    ok: true,
    value: {
      provider: provider.value,
      accountAddress: accountAddress.value,
      network: network.value,
      label: label.value,
    },
  };
}

function parseDisconnectWalletPayload(payload: unknown):
  | {
      ok: true;
      value: {
        accountAddress: string;
        network: string;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const accountAddress = parseRequiredSingleLineText(payload.accountAddress, {
    field: "accountAddress",
    maxLength: MAX_IDENTIFIER_LENGTH,
    allowCodeLike: true,
  });
  const network = parseRequiredSingleLineText(payload.network, {
    field: "network",
    maxLength: 80,
  });

  if (!accountAddress.ok) {
    return { ok: false, message: accountAddress.message };
  }
  if (!network.ok) {
    return { ok: false, message: network.message };
  }

  return {
    ok: true,
    value: {
      accountAddress: accountAddress.value,
      network: network.value,
    },
  };
}

function parseAdminMintStatusPayload(payload: unknown):
  | {
      ok: true;
      value: {
        status: "under_review" | "approved" | "rejected";
        note?: string;
        txHash?: string;
        adminWalletAddress?: string;
        chainId?: number;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const status = typeof payload.status === "string" ? payload.status : "";
  const note = parseOptionalMultilineText(payload.note, {
    field: "note",
    maxLength: MAX_NOTE_LENGTH,
  });
  const txHash = parseOptionalSingleLineText(payload.txHash, {
    field: "txHash",
    maxLength: 66,
    allowCodeLike: true,
  });
  const adminWalletAddress = parseOptionalSingleLineText(
    payload.adminWalletAddress,
    {
      field: "adminWalletAddress",
      maxLength: MAX_IDENTIFIER_LENGTH,
      allowCodeLike: true,
    },
  );
  const chainIdRaw =
    typeof payload.chainId === "number"
      ? payload.chainId
      : typeof payload.chainId === "string"
        ? Number(payload.chainId)
        : undefined;
  if (!note.ok) {
    return { ok: false, message: note.message };
  }
  if (!txHash.ok) {
    return { ok: false, message: txHash.message };
  }
  if (!adminWalletAddress.ok) {
    return { ok: false, message: adminWalletAddress.message };
  }
  if (
    chainIdRaw !== undefined &&
    (!Number.isInteger(chainIdRaw) || chainIdRaw < 1)
  ) {
    return { ok: false, message: "chainId must be a positive integer" };
  }
  if (txHash.value && !/^0x[0-9a-fA-F]{64}$/.test(txHash.value)) {
    return { ok: false, message: "txHash must be a valid transaction hash" };
  }

  if (
    !ALLOWED_ADMIN_MINT_STATUSES.includes(
      status as (typeof ALLOWED_ADMIN_MINT_STATUSES)[number],
    )
  ) {
    return { ok: false, message: "status is invalid for mint ops" };
  }
  if (status === "approved" && !txHash.value) {
    return { ok: false, message: "txHash is required when approving" };
  }
  if (status === "approved" && !adminWalletAddress.value) {
    return {
      ok: false,
      message: "adminWalletAddress is required when approving",
    };
  }

  return {
    ok: true,
    value: {
      status: status as "under_review" | "approved" | "rejected",
      note: note.value,
      txHash: txHash.value,
      adminWalletAddress: adminWalletAddress.value,
      chainId: chainIdRaw,
    },
  };
}

function parseAdminRedeemStatusPayload(payload: unknown):
  | {
      ok: true;
      value: {
        status: "queued" | "processing" | "approved" | "rejected";
        note?: string;
        queuePosition?: number;
        txHash?: string;
        adminWalletAddress?: string;
        chainId?: number;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const status = typeof payload.status === "string" ? payload.status : "";
  const note = parseOptionalMultilineText(payload.note, {
    field: "note",
    maxLength: MAX_NOTE_LENGTH,
  });
  const txHash = parseOptionalSingleLineText(payload.txHash, {
    field: "txHash",
    maxLength: 66,
    allowCodeLike: true,
  });
  const adminWalletAddress = parseOptionalSingleLineText(
    payload.adminWalletAddress,
    {
      field: "adminWalletAddress",
      maxLength: MAX_IDENTIFIER_LENGTH,
      allowCodeLike: true,
    },
  );
  const queuePositionRaw =
    typeof payload.queuePosition === "number"
      ? payload.queuePosition
      : undefined;
  const chainIdRaw =
    typeof payload.chainId === "number"
      ? payload.chainId
      : typeof payload.chainId === "string"
        ? Number(payload.chainId)
        : undefined;
  if (!note.ok) {
    return { ok: false, message: note.message };
  }
  if (!txHash.ok) {
    return { ok: false, message: txHash.message };
  }
  if (!adminWalletAddress.ok) {
    return { ok: false, message: adminWalletAddress.message };
  }
  if (
    chainIdRaw !== undefined &&
    (!Number.isInteger(chainIdRaw) || chainIdRaw < 1)
  ) {
    return { ok: false, message: "chainId must be a positive integer" };
  }
  if (txHash.value && !/^0x[0-9a-fA-F]{64}$/.test(txHash.value)) {
    return { ok: false, message: "txHash must be a valid transaction hash" };
  }

  if (
    !ALLOWED_ADMIN_REDEEM_STATUSES.includes(
      status as (typeof ALLOWED_ADMIN_REDEEM_STATUSES)[number],
    )
  ) {
    return { ok: false, message: "status is invalid for redemption ops" };
  }

  if (queuePositionRaw !== undefined && queuePositionRaw < 0) {
    return { ok: false, message: "queuePosition must be >= 0" };
  }
  if (status === "approved" && !txHash.value) {
    return { ok: false, message: "txHash is required when approving" };
  }
  if (status === "approved" && !adminWalletAddress.value) {
    return {
      ok: false,
      message: "adminWalletAddress is required when approving",
    };
  }

  return {
    ok: true,
    value: {
      status: status as
        | "queued"
        | "processing"
        | "approved"
        | "rejected",
      note: note.value,
      queuePosition: queuePositionRaw,
      txHash: txHash.value,
      adminWalletAddress: adminWalletAddress.value,
      chainId: chainIdRaw,
    },
  };
}

function parseAdminKybStatusPayload(payload: unknown):
  | {
      ok: true;
      value: {
        status:
          | "in_progress"
          | "under_review"
          | "approved"
          | "rejected"
          | "needs_update"
          | "blocked";
        note?: string;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const status = typeof payload.status === "string" ? payload.status : "";
  const note = parseOptionalMultilineText(payload.note, {
    field: "note",
    maxLength: MAX_NOTE_LENGTH,
  });
  if (!note.ok) {
    return { ok: false, message: note.message };
  }

  if (
    !ALLOWED_ADMIN_KYB_STATUSES.includes(
      status as (typeof ALLOWED_ADMIN_KYB_STATUSES)[number],
    )
  ) {
    return { ok: false, message: "status is invalid for institution review" };
  }

  return {
    ok: true,
    value: {
      status: status as
        | "in_progress"
        | "under_review"
        | "approved"
        | "rejected"
        | "needs_update"
        | "blocked",
      note: note.value,
    },
  };
}

function parseAdminKybDocumentStatusPayload(payload: unknown):
  | {
      ok: true;
      value: {
        status: "under_review" | "approved" | "rejected" | "needs_update";
        note?: string;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const status = typeof payload.status === "string" ? payload.status : "";
  const note = parseOptionalMultilineText(payload.note, {
    field: "note",
    maxLength: MAX_NOTE_LENGTH,
  });
  if (!note.ok) {
    return { ok: false, message: note.message };
  }

  if (
    !ALLOWED_ADMIN_KYB_DOCUMENT_STATUSES.includes(
      status as (typeof ALLOWED_ADMIN_KYB_DOCUMENT_STATUSES)[number],
    )
  ) {
    return { ok: false, message: "status is invalid for document review" };
  }

  return {
    ok: true,
    value: {
      status: status as "under_review" | "approved" | "rejected" | "needs_update",
      note: note.value,
    },
  };
}

function parseAdminBankAccountStatusPayload(payload: unknown):
  | {
      ok: true;
      value: {
        status: "pending" | "under_review" | "verified" | "rejected" | "inactive";
        note?: string;
      };
    }
  | { ok: false; message: string } {
  if (!isRecord(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const status = typeof payload.status === "string" ? payload.status : "";
  const note = parseOptionalMultilineText(payload.note, {
    field: "note",
    maxLength: MAX_NOTE_LENGTH,
  });
  if (!note.ok) {
    return { ok: false, message: note.message };
  }

  if (
    !ALLOWED_ADMIN_BANK_ACCOUNT_STATUSES.includes(
      status as (typeof ALLOWED_ADMIN_BANK_ACCOUNT_STATUSES)[number],
    )
  ) {
    return { ok: false, message: "status is invalid for bank account review" };
  }

  return {
    ok: true,
    value: {
      status: status as
        | "pending"
        | "under_review"
        | "verified"
        | "rejected"
        | "inactive",
      note: note.value,
    },
  };
}

function getCurrentUserId(user: unknown): string | null {
  if (!user || typeof user !== "object") {
    return null;
  }

  const id = (user as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

function isUniqueViolationError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: unknown }).code;
  return code === "23505";
}

const dashboardRoutes = new Hono<AppEnv>()
  .get(
    "/state",
    requireAuth,
    requirePermission("dashboard.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const state = await getDashboardStateForUser(userId);
      return c.json({ state });
    },
  )
  .get(
    "/overview",
    requireAuth,
    requirePermission("dashboard.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const state = await getDashboardStateForUser(userId);
      return c.json({
        kpis: {
          holdings: state.overviewCards.holdings,
          pendingRequests: state.overviewCards.pendingRequests,
          reserveCoverage: state.overviewCards.reserveCoverage,
          kybStatus: state.overviewCards.kybStatus,
        },
        activities: state.overviewActivities,
      });
    },
  )
  .post(
    "/mint-requests",
    requireAuth,
    requireAnyRole(DASHBOARD_EDITOR_ROLE_SLUGS),
    requirePermission("dashboard.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseCreateMintPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      const row = await createMintRequestForUser(userId, parsed.value);
      return c.json({ row }, 201);
    },
  )
  .post(
    "/redeem-requests",
    requireAuth,
    requireAnyRole(DASHBOARD_EDITOR_ROLE_SLUGS),
    requirePermission("dashboard.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseCreateRedeemPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      const row = await createRedeemRequestForUser(userId, parsed.value);
      return c.json({ row }, 201);
    },
  )
  .post(
    "/kyb/documents/:documentId/upload",
    requireAuth,
    requireAnyRole(DASHBOARD_EDITOR_ROLE_SLUGS),
    requirePermission("dashboard.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const documentId = parsePathParam(c.req.param("documentId"), {
        field: "document id",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!documentId.ok) {
        return c.json({ message: "Invalid document id" }, 400);
      }

      const quota = await consumeKybUploadQuota(userId);
      if (!quota.ok) {
        if (quota.code === "unavailable") {
          return c.json(
            { message: "Upload service is temporarily unavailable" },
            503,
          );
        }
        c.header("retry-after", String(quota.retryAfterSeconds));
        return c.json(
          {
            message: `Upload limit reached. You can upload up to ${KYB_UPLOAD_MAX_FILES} files every ${KYB_UPLOAD_WINDOW_MINUTES} minutes.`,
          },
          429,
        );
      }

      const contentLengthHeader = c.req.header("content-length");
      if (contentLengthHeader) {
        const contentLength = Number(contentLengthHeader);
        if (
          Number.isFinite(contentLength) &&
          contentLength > KYB_MAX_FILE_SIZE_BYTES + MULTIPART_FORM_OVERHEAD_BYTES
        ) {
          return c.json(
            {
              message: `PDF exceeds maximum allowed file size (${KYB_MAX_FILE_SIZE_MB} MB)`,
            },
            413,
          );
        }
      }

      const formData = await c.req.formData().catch(() => null);
      if (!formData) {
        return c.json({ message: "Invalid multipart payload" }, 400);
      }

      const file = formData.get("file");
      if (!(file instanceof File)) {
        return c.json({ message: "file is required" }, 400);
      }
      if (file.size > KYB_MAX_FILE_SIZE_BYTES) {
        return c.json(
          {
            message: `PDF exceeds maximum allowed file size (${KYB_MAX_FILE_SIZE_MB} MB)`,
          },
          413,
        );
      }

      try {
        const row = await uploadKybDocumentForUser(userId, {
          documentId: documentId.value,
          file,
        });
        return c.json({ row }, 201);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === DASHBOARD_KYB_DOCUMENT_DOMAIN_ERRORS.documentNotFound
          ) {
            return c.json({ message: "KYB document not found" }, 404);
          }
          if (error.message === KYB_FILE_STORAGE_ERRORS.emptyFile) {
            return c.json({ message: "Uploaded file is empty" }, 400);
          }
          if (error.message === KYB_FILE_STORAGE_ERRORS.fileTooLarge) {
            return c.json({ message: "PDF exceeds maximum allowed file size" }, 413);
          }
          if (error.message === KYB_FILE_STORAGE_ERRORS.invalidMimeType) {
            return c.json({ message: "Only PDF uploads are allowed" }, 415);
          }
          if (error.message === KYB_FILE_STORAGE_ERRORS.invalidPdfSignature) {
            return c.json({ message: "Invalid PDF content" }, 415);
          }
        }
        throw error;
      }
    },
  )
  .patch(
    "/settings",
    requireAuth,
    requireAnyRole(DASHBOARD_EDITOR_ROLE_SLUGS),
    requirePermission("settings.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseDashboardSettingsPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        await upsertDashboardSettingsForUser(userId, parsed.value);
        return c.json({ success: true });
      } catch (error) {
        if (isUniqueViolationError(error)) {
          return c.json({ message: "Email is already in use" }, 409);
        }
        throw error;
      }
    },
  )
  .post(
    "/bank-accounts",
    requireAuth,
    requireAnyRole(DASHBOARD_EDITOR_ROLE_SLUGS),
    requirePermission("settings.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseCreateBankAccountPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await createBankAccountForUser(userId, parsed.value);
        return c.json({ row }, 201);
      } catch (error) {
        if (isUniqueViolationError(error)) {
          return c.json(
            { message: "This bank account already exists for your user" },
            409,
          );
        }
        throw error;
      }
    },
  )
  .post(
    "/wallet/connect",
    requireAuth,
    requireAnyRole(DASHBOARD_EDITOR_ROLE_SLUGS),
    requirePermission("settings.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseConnectWalletPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await connectWalletForUser(userId, parsed.value);
        return c.json({ row }, 201);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === DASHBOARD_WALLET_DOMAIN_ERRORS.invalidConnectInput
          ) {
            return c.json({ message: "Invalid wallet connect payload" }, 400);
          }
          if (
            error.message ===
              DASHBOARD_WALLET_DOMAIN_ERRORS.connectionOwnershipConflict ||
            error.message ===
              DASHBOARD_WALLET_DOMAIN_ERRORS.addressOwnershipConflict
          ) {
            return c.json(
              { message: "Wallet is already connected to another user" },
              409,
            );
          }
        }
        if (isUniqueViolationError(error)) {
          return c.json({ message: "Wallet already exists" }, 409);
        }
        throw error;
      }
    },
  )
  .post(
    "/wallet/disconnect",
    requireAuth,
    requireAnyRole(DASHBOARD_EDITOR_ROLE_SLUGS),
    requirePermission("settings.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseDisconnectWalletPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await disconnectWalletForUser(userId, parsed.value);
        return c.json({ row }, 200);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message ===
            DASHBOARD_WALLET_DOMAIN_ERRORS.invalidDisconnectInput
          ) {
            return c.json(
              { message: "Invalid wallet disconnect payload" },
              400,
            );
          }
          if (
            error.message === DASHBOARD_WALLET_DOMAIN_ERRORS.addressNotFound
          ) {
            return c.json({ message: "Wallet address not found" }, 404);
          }
        }
        throw error;
      }
    },
  )
  .post(
    "/wallet/set-primary",
    requireAuth,
    requireAnyRole(DASHBOARD_EDITOR_ROLE_SLUGS),
    requirePermission("settings.view"),
    async (c) => {
      const userId = getCurrentUserId(c.get("user"));
      if (!userId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseDisconnectWalletPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await setPrimaryWalletAddressForUser(userId, parsed.value);
        return c.json({ row }, 200);
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message ===
            DASHBOARD_WALLET_DOMAIN_ERRORS.invalidPrimarySelectionInput
          ) {
            return c.json({ message: "Invalid set-primary payload" }, 400);
          }
          if (
            error.message === DASHBOARD_WALLET_DOMAIN_ERRORS.addressNotFound
          ) {
            return c.json({ message: "Wallet address not found" }, 404);
          }
        }
        throw error;
      }
    },
  )
  .get(
    "/admin/overview",
    requireAuth,
    requirePermission("dashboard.manage"),
    async (c) => {
      const state = await getAdminOverviewState();
      return c.json({ state });
    },
  )
  .get(
    "/admin/institutions",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("offchain.kyc_review"),
    async (c) => {
      const rows = await getAdminKybCases();
      return c.json({ rows });
    },
  )
  .patch(
    "/admin/institutions/:caseRef/status",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("offchain.kyc_review"),
    async (c) => {
      const actorUserId = getCurrentUserId(c.get("user"));
      if (!actorUserId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const caseRef = parsePathParam(c.req.param("caseRef"), {
        field: "case reference",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!caseRef.ok) {
        return c.json({ message: "Invalid case reference" }, 400);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseAdminKybStatusPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await updateAdminKybCaseStatus(
          actorUserId,
          caseRef.value,
          parsed.value,
        );
        return c.json({ row });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS.caseNotFound
        ) {
          return c.json({ message: "KYB case not found" }, 404);
        }
        throw error;
      }
    },
  )
  .patch(
    "/admin/institutions/:caseRef/documents/:documentId/status",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("offchain.kyc_review"),
    async (c) => {
      const actorUserId = getCurrentUserId(c.get("user"));
      if (!actorUserId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const caseRef = parsePathParam(c.req.param("caseRef"), {
        field: "case reference",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!caseRef.ok) {
        return c.json({ message: "Invalid case reference" }, 400);
      }

      const documentId = parsePathParam(c.req.param("documentId"), {
        field: "document id",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!documentId.ok) {
        return c.json({ message: "Invalid document id" }, 400);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseAdminKybDocumentStatusPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await updateAdminKybDocumentStatus(
          actorUserId,
          caseRef.value,
          documentId.value,
          parsed.value,
        );
        return c.json({ row });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS.caseNotFound
          ) {
            return c.json({ message: "KYB case not found" }, 404);
          }
          if (
            error.message ===
            DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.documentNotFound
          ) {
            return c.json({ message: "KYB document not found" }, 404);
          }
          if (
            error.message ===
            DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.submissionNotFound
          ) {
            return c.json({ message: "No uploaded file found for this document" }, 404);
          }
        }
        throw error;
      }
    },
  )
  .get(
    "/admin/institutions/:caseRef/documents/:documentId/download",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("offchain.kyc_review"),
    async (c) => {
      const caseRef = parsePathParam(c.req.param("caseRef"), {
        field: "case reference",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!caseRef.ok) {
        return c.json({ message: "Invalid case reference" }, 400);
      }

      const documentId = parsePathParam(c.req.param("documentId"), {
        field: "document id",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!documentId.ok) {
        return c.json({ message: "Invalid document id" }, 400);
      }

      try {
        const file = await getAdminKybDocumentFile(
          caseRef.value,
          documentId.value,
        );

        return new Response(new Uint8Array(file.fileBuffer), {
          status: 200,
          headers: {
            "content-type": file.contentType,
            "content-disposition": `attachment; filename="${file.fileName}"`,
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
          },
        });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message === DASHBOARD_ADMIN_KYB_DOMAIN_ERRORS.caseNotFound
          ) {
            return c.json({ message: "KYB case not found" }, 404);
          }
          if (
            error.message ===
              DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.documentNotFound ||
            error.message ===
              DASHBOARD_ADMIN_KYB_DOCUMENT_DOMAIN_ERRORS.submissionNotFound
          ) {
            return c.json({ message: "KYB document file not found" }, 404);
          }
          if (error.message === KYB_FILE_STORAGE_ERRORS.invalidStorageUri) {
            return c.json({ message: "KYB document file could not be loaded" }, 500);
          }
        }
        throw error;
      }
    },
  )
  .patch(
    "/admin/bank-accounts/:bankAccountId/status",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("offchain.fiat_movements"),
    async (c) => {
      const actorUserId = getCurrentUserId(c.get("user"));
      if (!actorUserId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const bankAccountId = parsePathParam(c.req.param("bankAccountId"), {
        field: "bank account id",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!bankAccountId.ok) {
        return c.json({ message: "Invalid bank account id" }, 400);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseAdminBankAccountStatusPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await updateAdminBankAccountStatus(
          actorUserId,
          bankAccountId.value,
          parsed.value,
        );
        return c.json({ row });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message ===
            DASHBOARD_ADMIN_BANK_ACCOUNT_DOMAIN_ERRORS.bankAccountNotFound
        ) {
          return c.json({ message: "Bank account not found" }, 404);
        }
        throw error;
      }
    },
  )
  .get(
    "/admin/reserve-management",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("offchain.fiat_movements"),
    async (c) => {
      const state = await getAdminReserveManagementState();
      return c.json({ state });
    },
  )
  .get(
    "/admin/wallet",
    requireAuth,
    requirePermission("dashboard.manage"),
    requireAnyPermission(["token.pause", "offchain.emergency"]),
    async (c) => {
      const state = await getAdminWalletState();
      return c.json({ state });
    },
  )
  .get(
    "/admin/mint-ops",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("token.mint"),
    async (c) => {
      const rows = await getMintOpsQueueForAdmin();
      return c.json({ rows });
    },
  )
  .get(
    "/admin/redemption-ops",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("token.burn"),
    async (c) => {
      const rows = await getRedemptionOpsQueueForAdmin();
      return c.json({ rows });
    },
  )
  .patch(
    "/admin/mint-ops/:requestRef/status",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("token.mint"),
    async (c) => {
      const actorUserId = getCurrentUserId(c.get("user"));
      if (!actorUserId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const requestRef = parsePathParam(c.req.param("requestRef"), {
        field: "request reference",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!requestRef.ok) {
        return c.json({ message: "Invalid request reference" }, 400);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseAdminMintStatusPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await updateMintRequestStatusForAdmin(
          actorUserId,
          requestRef.value,
          parsed.value,
        );
        return c.json({ row });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message ===
            DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.mintRequestNotFound
          ) {
            return c.json({ message: "Mint request not found" }, 404);
          }
          if (
            error.message ===
            DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.requestAlreadyCompleted
          ) {
            return c.json(
              { message: "Completed requests cannot be modified" },
              409,
            );
          }
          if (
            error.message ===
            DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.mintDestinationWalletMissing
          ) {
            return c.json(
              {
                message:
                  "Mint destination wallet is missing or invalid for this request",
              },
              400,
            );
          }
          if (
            error.message.startsWith(
              DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.onchainExecutionFailed,
            )
          ) {
            return c.json(
              {
                message: error.message.replace(
                  `${DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.onchainExecutionFailed}: `,
                  "",
                ),
              },
              502,
            );
          }
        }
        throw error;
      }
    },
  )
  .patch(
    "/admin/redemption-ops/:requestRef/status",
    requireAuth,
    requirePermission("dashboard.manage"),
    requirePermission("token.burn"),
    async (c) => {
      const actorUserId = getCurrentUserId(c.get("user"));
      if (!actorUserId) {
        return c.json({ message: "Unauthorized" }, 401);
      }

      const requestRef = parsePathParam(c.req.param("requestRef"), {
        field: "request reference",
        maxLength: MAX_IDENTIFIER_LENGTH,
      });
      if (!requestRef.ok) {
        return c.json({ message: "Invalid request reference" }, 400);
      }

      const payload = await c.req.json().catch(() => null);
      const parsed = parseAdminRedeemStatusPayload(payload);
      if (!parsed.ok) {
        return c.json({ message: parsed.message }, 400);
      }

      try {
        const row = await updateRedeemRequestStatusForAdmin(
          actorUserId,
          requestRef.value,
          parsed.value,
        );
        return c.json({ row });
      } catch (error) {
        if (error instanceof Error) {
          if (
            error.message ===
            DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.redeemRequestNotFound
          ) {
            return c.json({ message: "Redemption request not found" }, 404);
          }
          if (
            error.message ===
            DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.requestAlreadyCompleted
          ) {
            return c.json(
              { message: "Completed requests cannot be modified" },
              409,
            );
          }
          if (
            error.message ===
            DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.redeemSourceWalletMissing
          ) {
            return c.json(
              {
                message:
                  "Redeem source wallet is missing or not connected for this user",
              },
              400,
            );
          }
          if (
            error.message.startsWith(
              DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.onchainExecutionFailed,
            )
          ) {
            return c.json(
              {
                message: error.message.replace(
                  `${DASHBOARD_ADMIN_REQUEST_DOMAIN_ERRORS.onchainExecutionFailed}: `,
                  "",
                ),
              },
              502,
            );
          }
        }
        throw error;
      }
    },
  )
  .get(
    "/users",
    requireAuth,
    requireRole(SUPER_ADMIN_ROLE_SLUG),
    requireTableOperation("users", "read"),
    async (c) => {
      const page = parsePositiveInt(c.req.query("page"), 1);
      const pageSize = parseUsersPageSize(c.req.query("pageSize"));
      const sortBy = parseUsersSortBy(c.req.query("sortBy"));
      const sortDirection = parseUsersSortDirection(c.req.query("sortDir"));
      const result = await listUsersWithRolesPaginated(page, pageSize, {
        sortBy,
        sortDirection,
      });

      return c.json({
        rows: result.rows,
        pagination: result.pagination,
        sorting: {
          sortBy,
          sortDirection,
        },
      });
    },
  )
  .patch(
    "/users/:userId",
    requireAuth,
    requireRole(SUPER_ADMIN_ROLE_SLUG),
    requireTableOperation("users", "update"),
    async (c) => {
      const userId = parseUserIdParam(c.req.param("userId"));
      if (!userId) {
        return c.json({ message: "Invalid user id" }, 400);
      }

      const payload = await c.req.json().catch(() => null);
      const parsedPayload = parseUpdateUserPayload(payload);
      if (!parsedPayload.ok) {
        return c.json({ message: parsedPayload.message }, 400);
      }

      try {
        const updated = await updateUserWithRoles(userId, parsedPayload.value);
        if (!updated) {
          return c.json({ message: "User not found" }, 404);
        }

        return c.json({ row: updated });
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_ROLE_SLUGS") {
          return c.json({ message: "Invalid roleSlugs provided" }, 400);
        }
        if (isUniqueViolationError(error)) {
          return c.json({ message: "Email is already in use" }, 409);
        }
        throw error;
      }
    },
  )
  .delete(
    "/users/:userId",
    requireAuth,
    requireRole(SUPER_ADMIN_ROLE_SLUG),
    requireTableOperation("users", "delete"),
    async (c) => {
      const userId = parseUserIdParam(c.req.param("userId"));
      if (!userId) {
        return c.json({ message: "Invalid user id" }, 400);
      }

      const currentUserId = getCurrentUserId(c.get("user"));
      if (currentUserId && currentUserId === userId) {
        return c.json({ message: "You cannot disable your own account" }, 400);
      }

      const targetUser = await getUserWithRolesById(userId);
      if (!targetUser) {
        return c.json({ message: "User not found" }, 404);
      }

      if (targetUser.roles.includes(SUPER_ADMIN_ROLE_SLUG)) {
        return c.json({ message: "Super admin users cannot be disabled" }, 400);
      }

      const deleted = await softDeleteUser(userId);
      if (!deleted) {
        return c.json({ message: "User not found" }, 404);
      }

      return c.json({ success: true });
    },
  );

export { dashboardRoutes };
