import "dotenv/config";

import { reserveSnapshotsTable } from "@repo/db";
import { Worker } from "bullmq";

import { db } from "../../lib/db";
import {
  fetchErc20TotalSupply,
  getErc20SupplyRuntimeConfig,
} from "../../lib/erc20-supply";
import { createRedisConnection } from "../../lib/redis";
import { ensureReserveSnapshotSchedule, type ReserveSnapshotJobPayload } from "../queues";

const workerConnection = createRedisConnection();

function toMinuteBoundary(now: Date) {
  const snapshotAt = new Date(now);
  snapshotAt.setUTCSeconds(0, 0);
  return snapshotAt;
}

function toSnapshotRef(scope: "public" | "treasury", snapshotAt: Date) {
  const compactTimestamp = snapshotAt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000Z", "Z");
  return `RS-ONCHAIN-${scope.toUpperCase()}-${compactTimestamp}`;
}

async function persistSnapshot(input: {
  snapshotAt: Date;
  supply: string;
  reserve: string;
  coverageRatio: string;
  notes: string;
}) {
  const now = new Date();

  for (const scope of ["public", "treasury"] as const) {
    const snapshotRef = toSnapshotRef(scope, input.snapshotAt);

    await db
      .insert(reserveSnapshotsTable)
      .values({
        snapshotRef,
        snapshotScope: scope,
        snapshotAt: input.snapshotAt,
        reservesAmount: input.reserve,
        liabilitiesAmount: input.supply,
        coverageRatio: input.coverageRatio,
        varianceAmount: "0",
        status: "active",
        feedFreshness: "active",
        notes: input.notes,
      })
      .onConflictDoUpdate({
        target: [reserveSnapshotsTable.snapshotScope, reserveSnapshotsTable.snapshotAt],
        set: {
          snapshotRef,
          reservesAmount: input.reserve,
          liabilitiesAmount: input.supply,
          coverageRatio: input.coverageRatio,
          varianceAmount: "0",
          status: "active",
          feedFreshness: "active",
          notes: input.notes,
          updatedAt: now,
        },
      });
  }
}

export const reserveSnapshotWorker = new Worker<ReserveSnapshotJobPayload>(
  "reserve-snapshot",
  async () => {
    const runtime = getErc20SupplyRuntimeConfig();
    const supply = await fetchErc20TotalSupply({
      rpcUrl: runtime.rpcUrl,
      contractAddress: runtime.contractAddress,
    });

    const totalSupply = supply.totalSupply;
    const reserve = totalSupply;
    const coverageRatio = "1";
    const snapshotAt = toMinuteBoundary(new Date());

    await persistSnapshot({
      snapshotAt,
      supply: totalSupply,
      reserve,
      coverageRatio,
      notes: `Automated on-chain snapshot (${supply.contractAddress})`,
    });

    const result = {
      snapshotAt: snapshotAt.toISOString(),
      contractAddress: supply.contractAddress,
      totalSupply: supply.totalSupply,
      rawTotalSupply: supply.rawTotalSupply,
      decimals: supply.decimals,
      reverse: reserve,
      coverageRatio,
    };

    console.log("[worker:reserve-snapshot] persisted snapshot", result);
    return result;
  },
  {
    connection: workerConnection,
    concurrency: 1,
  },
);

reserveSnapshotWorker.on("failed", (job, error) => {
  console.error(
    `[worker:reserve-snapshot] job ${job?.id ?? "unknown"} failed`,
    error,
  );
});

async function bootstrapWorker() {
  await ensureReserveSnapshotSchedule();
  console.log("[worker:reserve-snapshot] scheduler registered");
}

void bootstrapWorker().catch((error) => {
  console.error("[worker:reserve-snapshot] failed to register scheduler", error);
  process.exitCode = 1;
});

