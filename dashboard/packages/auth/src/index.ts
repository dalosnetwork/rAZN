import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import {
  accountTable,
  createDb,
  sessionTable,
  userTable,
  verificationTable,
} from "@repo/db";

type BetterAuthInput = Parameters<typeof betterAuth>[0];

export type CreateAuthOptions = {
  databaseUrl: string;
  secret: string;
  baseURL?: string;
  options?: Omit<BetterAuthInput, "database" | "secret" | "baseURL">;
};

function getGoogleProviderFromEnv(): NonNullable<BetterAuthInput["socialProviders"]> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return {};
  }

  return {
    google: {
      clientId,
      clientSecret,
      accessType: "offline",
      prompt: "consent",
    },
  };
}

export function createAuth({ databaseUrl, secret, baseURL, options }: CreateAuthOptions) {
  const db = createDb(databaseUrl);
  const configuredSocialProviders: NonNullable<BetterAuthInput["socialProviders"]> = {
    ...getGoogleProviderFromEnv(),
    ...(options?.socialProviders ?? {}),
  };
  const hasSocialProviders = Object.keys(configuredSocialProviders).length > 0;

  return betterAuth({
    ...options,
    emailAndPassword: {
      enabled: true,
      ...options?.emailAndPassword,
    },
    socialProviders: hasSocialProviders ? configuredSocialProviders : undefined,
    baseURL,
    secret,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: userTable,
        session: sessionTable,
        account: accountTable,
        verification: verificationTable,
      },
    }),
  });
}

export function createAuthFromEnv(options?: CreateAuthOptions["options"]) {
  const databaseUrl = process.env.DATABASE_URL;
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }

  if (!secret) {
    throw new Error("Missing BETTER_AUTH_SECRET");
  }

  return createAuth({
    databaseUrl,
    secret,
    baseURL,
    options,
  });
}
