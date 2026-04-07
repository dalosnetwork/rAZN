import type {
  AdminAlert,
  ReserveSnapshot,
  TreasurySnapshot,
} from "@/app/(main)/dashboard/_mvp/types";

export const mockReserveTransparencySnapshots: ReserveSnapshot[] = [
  {
    timestamp: "2026-04-01T12:00:00.000Z",
    reserves: 1,
    supply: 1,
    coverageRatio: 1,
    syncStatus: "active",
  },
  {
    timestamp: "2026-04-02T12:00:00.000Z",
    reserves: 1,
    supply: 1,
    coverageRatio: 1,
    syncStatus: "active",
  },
  {
    timestamp: "2026-04-03T12:00:00.000Z",
    reserves: 1,
    supply: 1,
    coverageRatio: 1,
    syncStatus: "active",
  },
  {
    timestamp: "2026-04-04T12:00:00.000Z",
    reserves: 1,
    supply: 1,
    coverageRatio: 1,
    syncStatus: "warning",
  },
  {
    timestamp: "2026-04-05T12:00:00.000Z",
    reserves: 1,
    supply: 1,
    coverageRatio: 1,
    syncStatus: "warning",
  },
  {
    timestamp: "2026-04-06T12:00:00.000Z",
    reserves: 1,
    supply: 1,
    coverageRatio: 1,
    syncStatus: "warning",
  },
  {
    timestamp: "2026-04-07T12:00:00.000Z",
    reserves: 1,
    supply: 1,
    coverageRatio: 1,
    syncStatus: "active",
  },
];

export const mockReserveAlerts: AdminAlert[] = [
  {
    id: "reserve-alert-1",
    type: "data_sync",
    severity: "warning",
    source: "Reserve Snapshot Monitor",
    createdAt: "2026-04-07T09:20:00.000Z",
    status: "active",
    owner: "Treasury Ops",
    message: "Reserve sync used fallback source for one snapshot.",
  },
  {
    id: "reserve-alert-2",
    type: "coverage",
    severity: "warning",
    source: "Coverage Monitor",
    createdAt: "2026-04-06T19:10:00.000Z",
    status: "active",
    owner: "Risk Desk",
    message: "Coverage ratio moved near policy floor for one snapshot.",
  },
];

export const mockAdminReserveSnapshots: TreasurySnapshot[] = [
  {
    snapshotId: "RS-MOCK-20260405-1000",
    timestamp: "2026-04-05T10:00:00.000Z",
    reserves: 1,
    liabilities: 1,
    coverageRatio: 1,
    variance: 1,
    status: "warning",
    feedFreshness: "active",
    notes: "Mock snapshot for reserve management testing.",
    allocations: [
      { bucket: "Cash", amount: 1, share: 1 },
      { bucket: "T-Bills", amount: 1, share: 1 },
      { bucket: "Money Market", amount: 1, share: 1 },
    ],
    timeline: [
      {
        label: "Snapshot collected",
        timestamp: "2026-04-05T10:01:00.000Z",
        status: "active",
        actor: "Reserve Worker",
      },
      {
        label: "Coverage reviewed",
        timestamp: "2026-04-05T10:05:00.000Z",
        status: "warning",
        actor: "Risk Desk",
      },
    ],
  },
  {
    snapshotId: "RS-MOCK-20260405-1200",
    timestamp: "2026-04-05T12:00:00.000Z",
    reserves: 26_580_000,
    liabilities: 26_210_000,
    coverageRatio: 101.4117,
    variance: 370_000,
    status: "warning",
    feedFreshness: "active",
    notes: "Mock snapshot for reserve management testing.",
    allocations: [
      { bucket: "Cash", amount: 7_260_000, share: 27.31 },
      { bucket: "T-Bills", amount: 13_420_000, share: 50.49 },
      { bucket: "Money Market", amount: 5_900_000, share: 22.20 },
    ],
    timeline: [
      {
        label: "Snapshot collected",
        timestamp: "2026-04-05T12:01:00.000Z",
        status: "active",
        actor: "Reserve Worker",
      },
    ],
  },
  {
    snapshotId: "RS-MOCK-20260406-1000",
    timestamp: "2026-04-06T10:00:00.000Z",
    reserves: 1,
    liabilities: 1,
    coverageRatio: 1,
    variance: 1,
    status: "warning",
    feedFreshness: "stale",
    notes: "Mock stale feed scenario for UI testing.",
    allocations: [
      { bucket: "Cash", amount: 1, share: 1 },
      { bucket: "T-Bills", amount: 1, share: 1 },
      { bucket: "Money Market", amount: 1, share: 1 },
    ],
    timeline: [
      {
        label: "Snapshot collected",
        timestamp: "2026-04-06T10:01:00.000Z",
        status: "warning",
        actor: "Reserve Worker",
        note: "Fallback source used for one component.",
      },
    ],
  },
  {
    snapshotId: "RS-MOCK-20260407-1000",
    timestamp: "2026-04-07T10:00:00.000Z",
    reserves: 1,
    liabilities: 1,
    coverageRatio: 1,
    variance: 1,
    status: "active",
    feedFreshness: "active",
    notes: "Mock healthy snapshot for reserve management testing.",
    allocations: [
      { bucket: "Cash", amount: 1, share: 1 },
      { bucket: "T-Bills", amount: 1, share: 1 },
      { bucket: "Money Market", amount: 1, share: 1 },
    ],
    timeline: [
      {
        label: "Snapshot collected",
        timestamp: "2026-04-07T10:01:00.000Z",
        status: "active",
        actor: "Reserve Worker",
      },
      {
        label: "Coverage approved",
        timestamp: "2026-04-07T10:03:00.000Z",
        status: "approved",
        actor: "Treasury Ops",
      },
    ],
  },
];

export const mockAdminLiquidReserves = 1;
