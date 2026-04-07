import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

declare global {
  // eslint-disable-next-line no-var
  var __dashboardRedis__: Redis | undefined;
}

function createRedisClient(): Redis {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableAutoPipelining: true,
  });

  client.on("connect", () => {
    console.log("[redis] connected");
  });

  client.on("error", (error) => {
    console.error("[redis] error", error);
  });

  return client;
}

export const redis = globalThis.__dashboardRedis__ ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__dashboardRedis__ = redis;
}

export function createRedisConnection(): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableAutoPipelining: true,
  });
}
