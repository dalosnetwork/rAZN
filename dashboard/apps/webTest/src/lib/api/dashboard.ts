import type {
  AdminAlert,
  KybChecklistItem,
  KybSubmission,
  MintRequest,
  MvpStatus,
  OpsQueueItem,
  OverviewActivity,
  RedeemRequest,
  ReserveSnapshot,
  SettingsNotificationPreference,
  SettingsProfile,
  SettingsSecuritySession,
  WalletActivity,
  WalletAddress,
  WalletConnectionSummary,
} from "@/app/(main)/dashboard/_mvp/types";

export type DashboardStatePayload = {
  overviewCards: {
    holdings: number;
    pendingRequests: number;
    kybStatus: MvpStatus;
    reserveCoverage: number;
    latestActivityAt: string;
    blockers: number;
  };
  overviewActivities: OverviewActivity[];
  mintRequests: MintRequest[];
  redeemRequests: RedeemRequest[];
  redemptionOpsQueue: OpsQueueItem[];
  kybChecklist: KybChecklistItem[];
  kybSubmissions: KybSubmission[];
  reserveSnapshots: ReserveSnapshot[];
  reserveAlerts: AdminAlert[];
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
    status: MvpStatus;
    isPrimary: boolean;
    addedAt: string;
  }[];
  walletConnectionSummary: WalletConnectionSummary;
  walletAddresses: WalletAddress[];
  walletActivity: WalletActivity[];
  settingsProfile: SettingsProfile;
  settingsNotificationPreferences: SettingsNotificationPreference[];
  settingsSecuritySessions: SettingsSecuritySession[];
  settingsDashboardPreferences: {
    defaultLandingPage: string;
    compactTableDensity: boolean;
    showUsdInMillions: boolean;
    weeklyDigest: boolean;
    documentDelivery: "email" | "in_app";
  };
};

type DashboardStateResponse = {
  state?: DashboardStatePayload;
};

type DashboardOpsQueueResponse = {
  rows?: OpsQueueItem[];
};

export type DashboardNotification = {
  id: string;
  category:
    | "mint"
    | "redeem"
    | "kyb"
    | "wallet"
    | "bank_account"
    | "security"
    | "system";
  title: string;
  message: string;
  channel: "email" | "in_app" | "sms";
  status: MvpStatus;
  entityType?: string;
  entityRef?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type DashboardNotificationsPayload = {
  rows: DashboardNotification[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    unreadCount: number;
  };
};

type DashboardNotificationsResponse = {
  rows?: DashboardNotification[];
  pagination?: DashboardNotificationsPayload["pagination"];
};

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
    status: MvpStatus;
    timestamp: string;
  }[];
  transactionOversight: {
    id: string;
    reference: string;
    type: "Mint" | "Redeem";
    network: string;
    amount: number;
    updatedAt: string;
    status: MvpStatus;
  }[];
};

export type AdminInstitutionCase = {
  customerId: string;
  customerName: string;
  contactEmail: string;
  country: string;
  registrationDate: string;
  submittedAt: string;
  status: MvpStatus;
  onboardingStatus: "pending" | "approved";
  onboardedAt?: string;
  reviewer: string;
  riskLevel: "low" | "medium" | "high";
  bankDetails: {
    bankAccountId?: string;
    bankName: string;
    accountName: string;
    ibanMasked: string;
    accountNumberMasked: string;
    swiftCode: string;
    status: MvpStatus;
    addedAt?: string;
  };
  bankAccounts: {
    bankAccountId: string;
    bankName: string;
    accountName: string;
    ibanMasked: string;
    accountNumberMasked: string;
    swiftCode: string;
    status: MvpStatus;
    addedAt: string;
    isPrimary: boolean;
    country: string;
    currency: string;
  }[];
  walletAccounts: {
    walletAddressId: string;
    label: string;
    walletAddress: string;
    network: string;
    walletProvider: string;
    verificationStatus: MvpStatus;
    connectionStatus: MvpStatus;
    addedAt: string;
    isPrimary: boolean;
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
    status: MvpStatus;
    required: boolean;
    uploadedAt?: string;
    note?: string;
  }[];
  notes: string;
  history: {
    label: string;
    timestamp: string;
    status: MvpStatus;
    actor?: string;
    note?: string;
  }[];
};

export type AdminReserveManagementState = {
  snapshots: {
    snapshotId: string;
    timestamp: string;
    reserves: number;
    liabilities: number;
    coverageRatio: number;
    variance: number;
    status: MvpStatus;
    feedFreshness: MvpStatus;
    notes?: string;
    allocations: {
      bucket: string;
      amount: number;
      share: number;
    }[];
    timeline: {
      label: string;
      timestamp: string;
      status: MvpStatus;
      actor?: string;
      note?: string;
    }[];
  }[];
  liquidReserves: number;
};

export type ReserveManagementState = AdminReserveManagementState;

export type AdminWalletState = {
  wallets: {
    id: string;
    wallet: string;
    type: "minting_vault" | "treasury_vault" | "redemption_tracking";
    ownerName: string;
    ownerEmail: string;
    balance: number;
    status: MvpStatus;
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
    status: MvpStatus;
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
    status: MvpStatus;
    timestamp: string;
  }[];
};

type ApiErrorPayload = {
  message?: string;
  error?: {
    message?: string;
  };
};

function getErrorMessage(payload: ApiErrorPayload | null, fallback: string) {
  return payload?.error?.message ?? payload?.message ?? fallback;
}

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export type CreateMintRequestInput = {
  amount: number;
  paymentRef: string;
  destination: string;
  note?: string;
};

export type CreateRedeemRequestInput = {
  amount: number;
  destination: string;
  payoutRail: "bank" | "swift" | "crypto";
  note?: string;
};

export type DashboardSettingsPatch = Partial<{
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

export type CreateBankAccountInput = {
  accountHolder: string;
  bankName: string;
  ibanMasked: string;
  accountNumberMasked: string;
  bankAddress: string;
  swiftCode?: string;
  country: string;
  currency: string;
  isPrimary?: boolean;
};

export type ConnectWalletInput = {
  provider: string;
  accountAddress: string;
  network: string;
  label?: string;
};

export type DisconnectWalletInput = {
  accountAddress: string;
  network: string;
};

export type SetPrimaryWalletInput = {
  accountAddress: string;
  network: string;
};

export type UpdateAdminMintStatusInput = {
  requestRef: string;
  status: "under_review" | "approved" | "rejected";
  note?: string;
  txHash?: string;
  adminWalletAddress?: string;
  chainId?: number;
};

export type UpdateAdminRedemptionStatusInput = {
  requestRef: string;
  status: "queued" | "processing" | "approved" | "rejected";
  note?: string;
  queuePosition?: number;
  txHash?: string;
  adminWalletAddress?: string;
  chainId?: number;
};

export type UpdateAdminInstitutionStatusInput = {
  caseRef: string;
  status:
    | "in_progress"
    | "under_review"
    | "approved"
    | "rejected"
    | "needs_update"
    | "blocked";
  note?: string;
};

export type DisableAdminInstitutionProfileInput = {
  caseRef: string;
};

export type OnboardAdminInstitutionInput = {
  caseRef: string;
};

export type UploadKybDocumentInput = {
  documentId: string;
  file: File;
};

export type UpdateAdminInstitutionDocumentStatusInput = {
  caseRef: string;
  documentId: string;
  status: "under_review" | "approved" | "rejected" | "needs_update";
  note?: string;
};

export type UpdateAdminBankAccountStatusInput = {
  bankAccountId: string;
  status: "pending" | "under_review" | "verified" | "rejected" | "inactive";
  note?: string;
};

export type UpdateAdminWalletStatusInput = {
  walletAddressId: string;
  status: "pending" | "under_review" | "verified" | "rejected" | "inactive";
  note?: string;
};

export async function getDashboardState(): Promise<DashboardStatePayload> {
  const response = await fetch("/api/dashboard/state", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<ApiErrorPayload & DashboardStateResponse>(
    response,
  );

  if (!response.ok || !payload.state) {
    throw new Error(
      getErrorMessage(payload, "Failed to fetch dashboard state"),
    );
  }

  return payload.state;
}

export async function getDashboardNotifications(input: {
  page: number;
  pageSize: number;
}): Promise<DashboardNotificationsPayload> {
  const query = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  }).toString();
  const response = await fetch(`/api/dashboard/notifications?${query}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<
    ApiErrorPayload & DashboardNotificationsResponse
  >(response);

  if (!response.ok || !payload.rows || !payload.pagination) {
    throw new Error(
      getErrorMessage(payload, "Failed to fetch notifications"),
    );
  }

  return {
    rows: payload.rows,
    pagination: payload.pagination,
  };
}

export async function markDashboardNotificationsRead(input: {
  markAll?: boolean;
  ids?: string[];
}) {
  const response = await fetch("/api/dashboard/notifications", {
    method: "PATCH",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      markAll: Boolean(input.markAll),
      ids: input.ids ?? [],
    }),
  });

  const payload = await parseJson<ApiErrorPayload & { updated?: number }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to update notification state"),
    );
  }

  return {
    updated: Number(payload.updated ?? 0),
  };
}

export async function createMintRequest(input: CreateMintRequestInput) {
  const response = await fetch("/api/dashboard/mint-requests", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to create mint request"));
  }

  return payload.row;
}

export async function createRedeemRequest(input: CreateRedeemRequestInput) {
  const response = await fetch("/api/dashboard/redeem-requests", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to create redemption request"),
    );
  }

  return payload.row;
}

export async function uploadKybDocument(input: UploadKybDocumentInput) {
  const formData = new FormData();
  formData.set("file", input.file);

  const response = await fetch(
    `/api/dashboard/kyb/documents/${encodeURIComponent(input.documentId)}/upload`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to upload KYB document"));
  }

  return payload.row;
}

export async function updateDashboardSettings(input: DashboardSettingsPatch) {
  const response = await fetch("/api/dashboard/settings", {
    method: "PATCH",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload & { success?: boolean }>(
    response,
  );

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to save settings"));
  }

  return payload.success ?? true;
}

export async function createBankAccount(input: CreateBankAccountInput) {
  const response = await fetch("/api/dashboard/bank-accounts", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to add bank account"));
  }

  return payload.row;
}

export async function connectWallet(input: ConnectWalletInput) {
  const response = await fetch("/api/dashboard/wallet/connect", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to connect wallet"));
  }

  return payload.row;
}

export async function disconnectWallet(input: DisconnectWalletInput) {
  const response = await fetch("/api/dashboard/wallet/disconnect", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to disconnect wallet"));
  }

  return payload.row;
}

export async function setPrimaryWallet(input: SetPrimaryWalletInput) {
  const response = await fetch("/api/dashboard/wallet/set-primary", {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(getErrorMessage(payload, "Failed to set primary wallet"));
  }

  return payload.row;
}

export async function getAdminMintOpsQueue(): Promise<OpsQueueItem[]> {
  const response = await fetch("/api/dashboard/admin/mint-ops", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<ApiErrorPayload & DashboardOpsQueueResponse>(
    response,
  );

  if (!response.ok || !payload.rows) {
    throw new Error(getErrorMessage(payload, "Failed to fetch mint ops queue"));
  }

  return payload.rows;
}

export async function getAdminRedemptionOpsQueue(): Promise<OpsQueueItem[]> {
  const response = await fetch("/api/dashboard/admin/redemption-ops", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<ApiErrorPayload & DashboardOpsQueueResponse>(
    response,
  );

  if (!response.ok || !payload.rows) {
    throw new Error(
      getErrorMessage(payload, "Failed to fetch redemption ops queue"),
    );
  }

  return payload.rows;
}

export async function getAdminOverviewState(): Promise<AdminOverviewState> {
  const response = await fetch("/api/dashboard/admin/overview", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<
    ApiErrorPayload & { state?: AdminOverviewState }
  >(response);

  if (!response.ok || !payload.state) {
    throw new Error(
      getErrorMessage(payload, "Failed to fetch admin overview"),
    );
  }

  return payload.state;
}

export async function getAdminInstitutionCases(): Promise<
  AdminInstitutionCase[]
> {
  const response = await fetch("/api/dashboard/admin/institutions", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<
    ApiErrorPayload & { rows?: AdminInstitutionCase[] }
  >(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to fetch institution cases"),
    );
  }

  return payload.rows ?? [];
}

export async function updateAdminInstitutionStatus(
  input: UpdateAdminInstitutionStatusInput,
) {
  const response = await fetch(
    `/api/dashboard/admin/institutions/${encodeURIComponent(input.caseRef)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        note: input.note,
      }),
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to update institution status"),
    );
  }

  return payload.row;
}

export async function disableAdminInstitutionProfile(
  input: DisableAdminInstitutionProfileInput,
) {
  const response = await fetch(
    `/api/dashboard/admin/institutions/${encodeURIComponent(input.caseRef)}/disable-profile`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to disable customer profile"),
    );
  }

  return payload.row;
}

export async function onboardAdminInstitution(
  input: OnboardAdminInstitutionInput,
) {
  const response = await fetch(
    `/api/dashboard/admin/institutions/${encodeURIComponent(input.caseRef)}/onboard`,
    {
      method: "POST",
      credentials: "include",
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to onboard customer profile"),
    );
  }

  return payload.row;
}

export async function updateAdminInstitutionDocumentStatus(
  input: UpdateAdminInstitutionDocumentStatusInput,
) {
  const response = await fetch(
    `/api/dashboard/admin/institutions/${encodeURIComponent(input.caseRef)}/documents/${encodeURIComponent(input.documentId)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        note: input.note,
      }),
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to update document review status"),
    );
  }

  return payload.row;
}

export function getAdminInstitutionDocumentDownloadUrl(
  caseRef: string,
  documentId: string,
) {
  return `/api/dashboard/admin/institutions/${encodeURIComponent(caseRef)}/documents/${encodeURIComponent(documentId)}/download`;
}

export async function updateAdminBankAccountStatus(
  input: UpdateAdminBankAccountStatusInput,
) {
  const response = await fetch(
    `/api/dashboard/admin/bank-accounts/${encodeURIComponent(input.bankAccountId)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        note: input.note,
      }),
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to update bank account status"),
    );
  }

  return payload.row;
}

export async function updateAdminWalletStatus(
  input: UpdateAdminWalletStatusInput,
) {
  const response = await fetch(
    `/api/dashboard/admin/wallet/${encodeURIComponent(input.walletAddressId)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        note: input.note,
      }),
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to update wallet status"),
    );
  }

  return payload.row;
}

export async function getAdminReserveManagementState(): Promise<AdminReserveManagementState> {
  const response = await fetch("/api/dashboard/admin/reserve-management", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<
    ApiErrorPayload & { state?: AdminReserveManagementState }
  >(response);

  if (!response.ok || !payload.state) {
    throw new Error(
      getErrorMessage(payload, "Failed to fetch reserve management state"),
    );
  }

  return payload.state;
}

export async function getReserveManagementState(): Promise<ReserveManagementState> {
  const response = await fetch("/api/dashboard/reserve-management", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<
    ApiErrorPayload & { state?: ReserveManagementState }
  >(response);

  if (!response.ok || !payload.state) {
    throw new Error(
      getErrorMessage(payload, "Failed to fetch reserve management state"),
    );
  }

  return payload.state;
}

export async function getAdminWalletState(): Promise<AdminWalletState> {
  const response = await fetch("/api/dashboard/admin/wallet", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const payload = await parseJson<
    ApiErrorPayload & { state?: AdminWalletState }
  >(response);

  if (!response.ok || !payload.state) {
    throw new Error(getErrorMessage(payload, "Failed to fetch admin wallets"));
  }

  return payload.state;
}

export async function updateAdminMintStatus(input: UpdateAdminMintStatusInput) {
  const response = await fetch(
    `/api/dashboard/admin/mint-ops/${encodeURIComponent(input.requestRef)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        note: input.note,
        txHash: input.txHash,
        adminWalletAddress: input.adminWalletAddress,
        chainId: input.chainId,
      }),
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to update mint request status"),
    );
  }

  return payload.row;
}

export async function updateAdminRedemptionStatus(
  input: UpdateAdminRedemptionStatusInput,
) {
  const response = await fetch(
    `/api/dashboard/admin/redemption-ops/${encodeURIComponent(input.requestRef)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        note: input.note,
        queuePosition: input.queuePosition,
        txHash: input.txHash,
        adminWalletAddress: input.adminWalletAddress,
        chainId: input.chainId,
      }),
    },
  );

  const payload = await parseJson<ApiErrorPayload & { row?: unknown }>(
    response,
  );
  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload, "Failed to update redemption request status"),
    );
  }

  return payload.row;
}
