import { createMiddleware } from "hono/factory";
import { userTable } from "@repo/db";
import { and, eq, isNull } from "drizzle-orm";

import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { getUserAccess } from "../lib/rbac";
import type { AppEnv } from "../types";

type SessionPayload = {
  session?: unknown;
  user?: {
    id?: string;
  } | null;
};

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
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

  const userId = typeof payload.user?.id === "string" ? payload.user.id : null;
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

  const access = userId
    ? await getUserAccess(userId)
    : {
        roleSlugs: [],
        permissionKeys: [],
      };
  c.set("access", access);

  const refreshedCookie = sessionResponse.headers.get("set-cookie");
  if (refreshedCookie) {
    c.header("set-cookie", refreshedCookie);
  }

  await next();
});
