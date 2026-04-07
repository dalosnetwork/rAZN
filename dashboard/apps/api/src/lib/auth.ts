import { createAuthFromEnv } from "@repo/auth";

const expiresIn = Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 30);
const updateAge = Number(process.env.AUTH_SESSION_UPDATE_AGE_SECONDS ?? 60 * 15);
const cookieCacheMaxAge = Number(process.env.AUTH_SESSION_COOKIE_CACHE_MAX_AGE_SECONDS ?? 300);

export const auth = createAuthFromEnv({
  basePath: "/auth",
  session: {
    expiresIn,
    updateAge,
    cookieCache: {
      enabled: true,
      maxAge: cookieCacheMaxAge,
    },
  },
});
