import { Context, Hono } from "hono";
import { roleTable, userRoleTable, userTable } from "@repo/db";
import { and, eq, isNull } from "drizzle-orm";

import { auth } from "../lib/auth";
import { db } from "../lib/db";
import {
  parseOptionalSingleLineText,
  parseRequiredEmail,
  parseRequiredSingleLineText,
  type ValidationResult,
} from "../lib/input-validation";
import type { AppEnv } from "../types";

type LoginBody = {
  email?: string;
  password?: string;
  rememberMe?: boolean;
  callbackURL?: string;
};

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
  callbackURL?: string;
};

const DEFAULT_REGISTER_ROLE_SLUG = "user";
const MAX_SHORT_INPUT_LENGTH = 150;
const MAX_CALLBACK_URL_LENGTH = 500;

function parseLoginPayload(
  payload: unknown,
): ValidationResult<{
  email: string;
  password: string;
  rememberMe?: boolean;
  callbackURL?: string;
}> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const data = payload as Record<string, unknown>;

  const email = parseRequiredEmail(data.email, { field: "email" });
  if (!email.ok) {
    return email;
  }

  const password = parseRequiredSingleLineText(data.password, {
    field: "password",
    minLength: 6,
    maxLength: MAX_SHORT_INPUT_LENGTH,
    allowCodeLike: true,
  });
  if (!password.ok) {
    return password;
  }

  if (data.rememberMe !== undefined && typeof data.rememberMe !== "boolean") {
    return { ok: false, message: "rememberMe must be boolean" };
  }

  const callbackURL = parseOptionalSingleLineText(data.callbackURL, {
    field: "callbackURL",
    maxLength: MAX_CALLBACK_URL_LENGTH,
    allowCodeLike: true,
  });
  if (!callbackURL.ok) {
    return callbackURL;
  }

  return {
    ok: true,
    value: {
      email: email.value,
      password: password.value,
      rememberMe:
        typeof data.rememberMe === "boolean" ? data.rememberMe : undefined,
      callbackURL: callbackURL.value,
    },
  };
}

function parseRegisterPayload(
  payload: unknown,
): ValidationResult<{
  name: string;
  email: string;
  password: string;
  callbackURL?: string;
}> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Invalid request body" };
  }

  const data = payload as Record<string, unknown>;

  const name = parseRequiredSingleLineText(data.name, {
    field: "name",
    minLength: 2,
    maxLength: MAX_SHORT_INPUT_LENGTH,
    collapseWhitespace: true,
  });
  if (!name.ok) {
    return name;
  }

  const email = parseRequiredEmail(data.email, { field: "email" });
  if (!email.ok) {
    return email;
  }

  const password = parseRequiredSingleLineText(data.password, {
    field: "password",
    minLength: 6,
    maxLength: MAX_SHORT_INPUT_LENGTH,
    allowCodeLike: true,
  });
  if (!password.ok) {
    return password;
  }

  const callbackURL = parseOptionalSingleLineText(data.callbackURL, {
    field: "callbackURL",
    maxLength: MAX_CALLBACK_URL_LENGTH,
    allowCodeLike: true,
  });
  if (!callbackURL.ok) {
    return callbackURL;
  }

  return {
    ok: true,
    value: {
      name: name.value,
      email: email.value,
      password: password.value,
      callbackURL: callbackURL.value,
    },
  };
}

async function assignDefaultRoleToRegisteredUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const [registeredUser] = await db
    .select({
      id: userTable.id,
    })
    .from(userTable)
    .where(
      and(eq(userTable.email, normalizedEmail), isNull(userTable.deletedAt)),
    )
    .limit(1);

  if (!registeredUser) {
    throw new Error("REGISTERED_USER_NOT_FOUND");
  }

  const [defaultRole] = await db
    .select({
      id: roleTable.id,
    })
    .from(roleTable)
    .where(eq(roleTable.slug, DEFAULT_REGISTER_ROLE_SLUG))
    .limit(1);

  if (!defaultRole) {
    throw new Error("DEFAULT_ROLE_NOT_FOUND");
  }

  await db
    .insert(userRoleTable)
    .values({
      userId: registeredUser.id,
      roleId: defaultRole.id,
    })
    .onConflictDoNothing();
}

function buildAuthRequest(c: Context, path: string, body?: unknown) {
  const targetUrl = new URL(path, c.req.url);
  const headers = new Headers(c.req.raw.headers);
  headers.delete("content-length");

  if (body) {
    headers.set("content-type", "application/json");
  }

  return new Request(targetUrl, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

const authRoutes = new Hono<AppEnv>()
  .post("/register", async (c) => {
    const body = (await c.req.json().catch(() => null)) as RegisterBody | null;
    const parsed = parseRegisterPayload(body);
    if (!parsed.ok) {
      return c.json({ message: parsed.message }, 400);
    }

    const request = buildAuthRequest(c, "/auth/sign-up/email", {
      name: parsed.value.name,
      email: parsed.value.email,
      password: parsed.value.password,
      callbackURL: parsed.value.callbackURL,
    });

    const response = await auth.handler(request);
    if (!response.ok) {
      return response;
    }

    try {
      await assignDefaultRoleToRegisteredUser(parsed.value.email);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "DEFAULT_ROLE_NOT_FOUND"
      ) {
        return c.json(
          {
            message:
              "Default 'user' role is missing. Seed RBAC roles before allowing registration.",
          },
          500,
        );
      }

      return c.json(
        { message: "Registration succeeded but role assignment failed." },
        500,
      );
    }

    return response;
  })
  .post("/login", async (c) => {
    const body = (await c.req.json().catch(() => null)) as LoginBody | null;
    const parsed = parseLoginPayload(body);
    if (!parsed.ok) {
      return c.json({ message: parsed.message }, 400);
    }

    const request = buildAuthRequest(c, "/auth/sign-in/email", {
      email: parsed.value.email,
      password: parsed.value.password,
      rememberMe: parsed.value.rememberMe,
      callbackURL: parsed.value.callbackURL,
    });

    return auth.handler(request);
  })
  .post("/logout", async (c) => {
    const request = buildAuthRequest(c, "/auth/sign-out");
    return auth.handler(request);
  })
  .all("/*", async (c) => {
    return auth.handler(c.req.raw);
  });

export { authRoutes };
