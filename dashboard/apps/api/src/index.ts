import "dotenv/config";

import { serve } from "@hono/node-server";
import "./lib/db";
import { app } from "./app";

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
