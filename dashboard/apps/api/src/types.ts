import type { UserAccess } from "./lib/rbac";

type SessionPayload = unknown;
type UserPayload = unknown;
export type UserOnboardingPayload = {
  required: boolean;
  isOnboarded: boolean;
  latestKybStatus: string | null;
};

export type AppEnv = {
  Variables: {
    user: UserPayload;
    session: SessionPayload;
    access: UserAccess;
    onboarding: UserOnboardingPayload;
  };
};
