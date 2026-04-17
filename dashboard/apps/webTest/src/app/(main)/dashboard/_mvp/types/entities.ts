import type { MvpStatus } from "./status";

export type TimelineEntry = {
  label: string;
  timestamp: string;
  status: MvpStatus;
  actor?: string;
  note?: string;
};

export type MintRequest = {
  requestId: string;
  submittedAt: string;
  amount: number;
  paymentRef: string;
  destination: string;
  status: MvpStatus;
  updatedAt: string;
  timeline: TimelineEntry[];
};

export type RedeemRequest = {
  requestId: string;
  createdAt: string;
  amount: number;
  destination: string;
  payoutRail: "bank" | "swift" | "crypto";
  queuePos: number;
  status: MvpStatus;
  updatedAt: string;
  timeline: TimelineEntry[];
};

export type KybChecklistItem = {
  id: string;
  label: string;
  category: "identity" | "address" | "source_of_funds" | "business";
  status: MvpStatus;
  required: boolean;
  uploadedAt?: string;
  note?: string;
};

export type KybSubmission = {
  caseId: string;
  docType: string;
  submittedAt: string;
  reviewedAt?: string;
  version: number;
  status: MvpStatus;
  reviewerNote?: string;
};

export type ReserveSnapshot = {
  timestamp: string;
  reserves: number;
  supply: number;
  coverageRatio: number;
  syncStatus: MvpStatus;
};

export type AdminAlert = {
  id: string;
  type: string;
  severity: MvpStatus;
  source: string;
  createdAt: string;
  status: MvpStatus;
  owner: string;
  message: string;
};

export type OpsQueueItem = {
  requestId: string;
  user: string;
  amount: number;
  submittedAt: string;
  destinationAccount?: string;
  onchainWalletAddress?: string;
  status: MvpStatus;
  assignee: string;
  riskFlag?: string;
  kybState?: MvpStatus;
  queuePos?: number;
  sla?: string;
  timeline: TimelineEntry[];
};

export type KybReviewCase = {
  customerId: string;
  customerName: string;
  contactEmail: string;
  country: string;
  registrationDate: string;
  submittedAt: string;
  status: MvpStatus;
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
  documents: KybChecklistItem[];
  notes: string;
  history: TimelineEntry[];
};

export type PlatformIndicator = {
  id: string;
  label: string;
  value: string;
  status: MvpStatus;
  updatedAt: string;
};

export type OverviewActivity = {
  id: string;
  type: "mint" | "redeem" | "kyb";
  requestId: string;
  date: string;
  amount?: number;
  status: MvpStatus;
};

export type WalletConnectionSummary = {
  provider: string;
  accountId: string;
  primaryNetwork: string;
  connectedSince: string;
  status: MvpStatus;
  dailyTransferLimit: number;
  usedToday: number;
  policyProfile: string;
};

export type WalletAddress = {
  id: string;
  label: string;
  address: string;
  network: string;
  type: "primary" | "secondary" | "treasury" | "withdrawal";
  balance: number;
  allocation: number;
  verificationStatus: MvpStatus;
  connectionStatus: MvpStatus;
  addedAt: string;
  lastActivityAt?: string;
  tags: string[];
  timeline: TimelineEntry[];
};

export type WalletNetworkSupport = {
  id: string;
  network: string;
  chainId: string;
  status: MvpStatus;
  finalityTarget: string;
  latencyMs: number;
  lastCheckedAt: string;
};

export type WalletActivity = {
  id: string;
  action: string;
  actor: string;
  target: string;
  network: string;
  status: MvpStatus;
  timestamp: string;
};

export type SettingsProfile = {
  fullName: string;
  organization: string;
  email: string;
  contactPhone: string;
  timezone: string;
  baseCurrency: string;
  reportingContact: string;
};

export type SettingsNotificationPreference = {
  id: string;
  label: string;
  description: string;
  channel: "email" | "in_app" | "sms";
  enabled: boolean;
  criticalOnly?: boolean;
};

export type SettingsSecuritySession = {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActiveAt: string;
  current: boolean;
  status: MvpStatus;
};

export type TreasuryAllocationPoint = {
  date: string;
  cash: number;
  tBills: number;
  moneyMarket: number;
  overnightRepo: number;
};

export type TreasurySnapshot = {
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
  timeline: TimelineEntry[];
};

export type TreasuryAccountBalance = {
  id: string;
  accountName: string;
  institution: string;
  currency: string;
  available: number;
  restricted: number;
  status: MvpStatus;
  updatedAt: string;
};

export type TreasuryEvent = {
  id: string;
  action: string;
  actor: string;
  reference: string;
  amount?: number;
  status: MvpStatus;
  timestamp: string;
};

export type ContractDeployment = {
  id: string;
  contract: string;
  network: string;
  address: string;
  version: string;
  releaseTag: string;
  owner: string;
  status: MvpStatus;
  updatedAt: string;
};

export type ContractControlAction = {
  id: string;
  action: string;
  scope: string;
  requestedBy: string;
  requestedAt: string;
  status: MvpStatus;
  requiresApproval: boolean;
  approvedBy?: string;
  executedAt?: string;
  note?: string;
  timeline: TimelineEntry[];
};

export type ContractSignal = {
  id: string;
  label: string;
  value: string;
  status: MvpStatus;
  updatedAt: string;
};

export type BlacklistEntry = {
  id: string;
  address: string;
  entity: string;
  network: string;
  category: "wallet" | "beneficiary" | "institution";
  reason: string;
  riskLevel: "low" | "medium" | "high";
  status: MvpStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  note?: string;
  tags: string[];
  history: TimelineEntry[];
};
