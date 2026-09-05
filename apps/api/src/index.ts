import { serve } from "@hono/node-server";
import { loadEnv } from "./config/env.ts";
import { createApp } from "./app.ts";

const env = loadEnv();
const app = createApp(env);

serve(
  { fetch: app.fetch, port: env.API_PORT, hostname: env.API_HOST },
  (info) => {
    console.log(`OpenMiQ-API listening on http://${env.API_HOST}:${info.port}`);
  },
);
