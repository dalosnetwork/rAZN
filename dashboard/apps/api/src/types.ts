import type { UserAccess } from "./lib/rbac";

type SessionPayload = unknown;
type UserPayload = unknown;

export type AppEnv = {
  Variables: {
    user: UserPayload;
    session: SessionPayload;
    access: UserAccess;
  };
};
