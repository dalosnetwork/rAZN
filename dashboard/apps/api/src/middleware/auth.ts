import { createMiddleware } from "hono/factory";
import { hasAdminRole } from "@repo/auth/rbac";
import { kybCasesTable, userTable } from "@repo/db";
import { and, desc, eq, isNull } from "drizzle-orm";

import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { getUserAccess } from "../lib/rbac";
import type { AppEnv, UserOnboardingPayload } from "../types";

type SessionPayload = {
  session?: unknown;
  user?: {
    id?: string;
  } | null;
};

type RequireAuthOptions = {
  allowPendingOnboarding?: boolean;
};

const DEFAULT_ACCESS = {
  roleSlugs: [],
  permissionKeys: [],
};

const DEFAULT_ONBOARDING_STATE: UserOnboardingPayload = {
  required: false,
  isOnboarded: true,
  latestKybStatus: null,
};

async function resolveOnboardingState(userId: string, isAdmin: boolean) {
  if (isAdmin) {
    return DEFAULT_ONBOARDING_STATE;
  }

  const [latestKybCase] = await db
    .select({ status: kybCasesTable.status })
    .from(kybCasesTable)
    .where(eq(kybCasesTable.userId, userId))
    .orderBy(desc(kybCasesTable.submittedAt))
    .limit(1);

  const latestKybStatus = latestKybCase?.status ?? null;
  return {
    required: true,
    isOnboarded: latestKybStatus === "approved",
    latestKybStatus,
  } satisfies UserOnboardingPayload;
}

function buildRequireAuth(options: RequireAuthOptions = {}) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const sessionUrl = new URL("/auth/get-session", c.req.url);
    const headers = new Headers(c.req.raw.headers);
    headers.delete("content-length");

    const sessionRequest = new Request(sessionUrl, {
      method: "GET",
      headers,
    });

    const sessionResponse = await auth.handler(sessionRequest);
    if (!sessionResponse.ok) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    const payload = (await sessionResponse
      .json()
      .catch(() => null)) as SessionPayload | null;
    if (!payload?.user) {
      return c.json({ message: "Unauthorized" }, 401);
    }

    c.set("user", payload.user);
    c.set("session", payload.session);

    const userId =
      typeof payload.user?.id === "string" ? payload.user.id : null;
    if (userId) {
      const [activeUser] = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(and(eq(userTable.id, userId), isNull(userTable.deletedAt)))
        .limit(1);

      if (!activeUser) {
        return c.json({ message: "Unauthorized" }, 401);
      }
    }

    const access = userId ? await getUserAccess(userId) : DEFAULT_ACCESS;
    c.set("access", access);

    const onboarding = userId
      ? await resolveOnboardingState(userId, hasAdminRole(access.roleSlugs))
      : DEFAULT_ONBOARDING_STATE;
    c.set("onboarding", onboarding);

    if (
      !options.allowPendingOnboarding &&
      onboarding.required &&
      !onboarding.isOnboarded
    ) {
      return c.json(
        {
          code: "PENDING_ONBOARDING",
          message:
            "Your account is waiting for admin onboarding approval.",
        },
        401,
      );
    }

    const refreshedCookie = sessionResponse.headers.get("set-cookie");
    if (refreshedCookie) {
      c.header("set-cookie", refreshedCookie);
    }

    await next();
  });
}

export const requireAuth = buildRequireAuth();
export const requireAuthAllowPendingOnboarding = buildRequireAuth({
  allowPendingOnboarding: true,
});
