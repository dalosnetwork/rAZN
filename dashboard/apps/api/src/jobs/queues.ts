import { Queue } from "bullmq";

import { createRedisConnection } from "../lib/redis";
import { getErc20SupplyRuntimeConfig } from "../lib/erc20-supply";

export type ExampleJobPayload = {
  message: string;
};

export type ReserveSnapshotJobPayload = {
  trigger: "scheduler" | "manual";
};

const connection = createRedisConnection();

export const exampleQueue = new Queue("example", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

export function enqueueExampleJob(payload: ExampleJobPayload) {
  return exampleQueue.add("example", payload);
}

export const reserveSnapshotQueue = new Queue<ReserveSnapshotJobPayload>(
  "reserve-snapshot",
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  },
);

function buildCronPattern(intervalMinutes: number) {
  if (intervalMinutes < 1 || intervalMinutes > 60) {
    throw new Error("RESERVE_SNAPSHOT_INTERVAL_MINUTES must be between 1 and 60");
  }

  if (intervalMinutes === 1) {
    return "* * * * *";
  }

  if (intervalMinutes === 60) {
    return "0 * * * *";
  }

  return `*/${intervalMinutes} * * * *`;
}

export async function ensureReserveSnapshotSchedule() {
  const { intervalMinutes } = getErc20SupplyRuntimeConfig();
  const pattern = buildCronPattern(intervalMinutes);

  await reserveSnapshotQueue.add(
    "take-snapshot",
    { trigger: "scheduler" },
    {
      jobId: `reserve-snapshot-scheduler-${intervalMinutes}`,
      repeat: {
        pattern,
      },
    },
  );
}

export function enqueueReserveSnapshotJob(
  payload: ReserveSnapshotJobPayload = { trigger: "manual" },
) {
  return reserveSnapshotQueue.add("take-snapshot", payload);
}
