import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Env } from "./config/env.ts";
import { aboutApp } from "./routes/about.ts";
import { createBrandingApp } from "./routes/branding.ts";
import { createAuthApp } from "./routes/auth.ts";
import { createConsoleApp } from "./routes/console.ts";
import { createApplicationsApp } from "./routes/applications.ts";
import { createLegalApp } from "./routes/legal.ts";
import { createDiscordInteractionsApp } from "./routes/discordInteractions.ts";
import { createApiKeysConsoleApp } from "./routes/apiKeysConsole.ts";
import { createApiKeysAdminApp } from "./routes/apiKeysAdmin.ts";
import { createUsageApp } from "./routes/usage.ts";
import { createQuoteApp } from "./routes/quote.ts";
import { createAdminApp } from "./routes/admin.ts";
import { createSampleQuoteApp } from "./routes/sampleQuote.ts";
import { sessionMiddleware } from "./middleware/session.ts";

// Assembles the full app from its route modules — factored out of index.ts
// so tests can exercise the exact same wiring via `.request()` without
// starting a real HTTP server (index.ts only adds `serve()` on top).
export function createApp(env: Env) {
  const app = new OpenAPIHono();

  app.use("*", sessionMiddleware(env));

  app.route("/", aboutApp);
  app.route("/", createBrandingApp(env));
  app.route("/", createAuthApp(env));
  app.route("/", createConsoleApp(env));
  app.route("/", createApplicationsApp(env));
  app.route("/", createLegalApp(env));
  app.route("/", createDiscordInteractionsApp(env));
  app.route("/", createApiKeysConsoleApp(env));
  app.route("/", createApiKeysAdminApp(env));
  app.route("/", createUsageApp(env));
  app.route("/", createQuoteApp(env));
  app.route("/", createAdminApp(env));
  app.route("/", createSampleQuoteApp());

  app.doc("/api/docs/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "OpenMiQ-API",
      version: "0.1.0",
      description:
        "Based on OpenMiQ (https://github.com/otnc/OpenMiQ) by otoneko., with modifications for a Web API. Source: https://github.com/otnc/OpenMiQ-API",
    },
  });
  app.get("/api/docs", swaggerUI({ url: "/api/docs/openapi.json" }));

  return app;
}
