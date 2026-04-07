import { Worker } from "bullmq";

import { createRedisConnection } from "../../lib/redis";

const workerConnection = createRedisConnection();

export const exampleWorker = new Worker(
  "example",
  async (job) => {
    console.log(`[worker:example] processed job ${job.id}`, job.data);
  },
  {
    connection: workerConnection,
    concurrency: 5,
  },
);

exampleWorker.on("failed", (job, error) => {
  console.error(`[worker:example] job ${job?.id ?? "unknown"} failed`, error);
});
