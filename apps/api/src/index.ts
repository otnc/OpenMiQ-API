import { serve } from "@hono/node-server";
import { loadEnv } from "./config/env.ts";
import { createApp } from "./app.ts";
import { generateSampleQuote } from "./services/sampleQuoteService.ts";

const env = loadEnv();
const app = createApp(env);

// Fire-and-forget: the homepage sample quote is best-effort and shouldn't
// delay the server actually listening. generateSampleQuote() already
// catches its own errors.
void generateSampleQuote(env);

serve(
  { fetch: app.fetch, port: env.API_PORT, hostname: env.API_HOST },
  (info) => {
    console.log(`OpenMiQ-API listening on http://${env.API_HOST}:${info.port}`);
  },
);
