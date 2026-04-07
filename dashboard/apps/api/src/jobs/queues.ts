import { Queue } from "bullmq";

import { createRedisConnection } from "../lib/redis";

export type ExampleJobPayload = {
  message: string;
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
