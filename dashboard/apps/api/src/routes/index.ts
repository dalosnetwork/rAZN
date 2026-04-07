import { Hono } from "hono";

import { apiCompatRoutes } from "./api-compat";
import { authRoutes } from "./auth";
import { dashboardRoutes } from "./dashboard";
import type { AppEnv } from "../types";
import { usersRoutes } from "./users";

const routes = new Hono<AppEnv>()
  .route("/api", apiCompatRoutes)
  .route("/auth", authRoutes)
  .route("/dashboard", dashboardRoutes)
  .route("/users", usersRoutes);

export { routes };
