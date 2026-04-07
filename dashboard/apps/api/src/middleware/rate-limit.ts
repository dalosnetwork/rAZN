import { isIP } from "node:net";
import { createMiddleware } from "hono/factory";

import { redis } from "../lib/redis";

const WINDOW_SECONDS = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100);
const TRUSTED_PROXY_HOPS = Math.max(
  1,
  Number.parseInt(process.env.RATE_LIMIT_TRUSTED_PROXY_HOPS ?? "1", 10) || 1,
);

function normalizeIp(rawValue: string | undefined): string | null {
  if (!rawValue) {
    return null;
  }

  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  return isIP(value) ? value : null;
}

function getClientIp(headers: {
  xForwardedFor: string | undefined;
  xRealIp: string | undefined;
}): string {
  const forwardedForChain =
    headers.xForwardedFor
      ?.split(",")
      .map((part) => part.trim())
      .filter(Boolean) ?? [];

  // Walk from the right side of X-Forwarded-For where trusted proxies append.
  const trustedIndex = forwardedForChain.length - TRUSTED_PROXY_HOPS;
  if (trustedIndex >= 0) {
    const trustedIp = normalizeIp(forwardedForChain[trustedIndex]);
    if (trustedIp) {
      return trustedIp;
    }
  }

  const realIp = normalizeIp(headers.xRealIp);
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function rateLimit() {
  return createMiddleware(async (c, next) => {
    const ip = getClientIp({
      xForwardedFor: c.req.header("x-forwarded-for"),
      xRealIp: c.req.header("x-real-ip"),
    });
    const key = `ratelimit:${ip}:${c.req.path}`;

    let requestCount: number;
    try {
      requestCount = await redis.incr(key);
      if (requestCount === 1) {
        await redis.expire(key, WINDOW_SECONDS);
      }
    } catch (error) {
      console.warn("[rate-limit] Redis unavailable, continuing without rate limiting", {
        path: c.req.path,
        error: error instanceof Error ? error.message : "unknown",
      });
      return next();
    }

    if (requestCount > MAX_REQUESTS) {
      return c.json(
        {
          message: "Too many requests",
          provider: "redis (Arcjet-ready middleware placeholder)",
        },
        429,
      );
    }

    return next();
  });
}
