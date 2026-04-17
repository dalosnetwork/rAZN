import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

import { serve } from "@hono/node-server";

// Load service-local env first, then workspace-level env as fallback.
loadEnv({ path: resolve(process.cwd(), ".env"), override: false });
loadEnv({ path: resolve(process.cwd(), "../../.env"), override: false });

await import("./lib/db");
const { app } = await import("./app");

const port = Number(process.env.PORT ?? 3002);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`API is running on http://localhost:${info.port}`);
  },
);

export default app;
export type { AppType } from "./app";
