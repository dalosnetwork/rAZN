import { createAuthFromEnv } from "@repo/auth";

const SESSION_TTL_SECONDS = 60 * 60;
const expiresIn = SESSION_TTL_SECONDS;
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
